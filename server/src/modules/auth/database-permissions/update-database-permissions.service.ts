import {
	compact,
	flatten,
	forEach,
	fromPairs,
	get,
	isEqual,
	isFunction,
	isNil,
	isString,
	map,
	snakeCase,
	sortBy,
	uniq,
	uniqWith,
	values,
} from 'lodash';
import path from 'path';

import { checkRequiredEnvs } from '../../../shared/helpers/env-check';
import { CustomError } from '../../../shared/helpers/error';
import { graphqlQueryRequest } from '../../../shared/helpers/graphql-request';
import { logger } from '../../../shared/helpers/logger';

import { ROW_PERMISSIONS, RowPermission } from './row-permissions';
import { GRAPHQL_SIMPLE_TYPES, LIMIT_ROWS } from './update-database-permissions.const';
import {
	FinalRowPermission,
	IntrospectionField,
	ResolvedRowPermission,
	SegmentedTablePermissions,
	TableOperation,
	UsersGroup,
} from './update-database-permissions.types';

const fs = require('fs-extra');

export class UpdateDatabasePermissionsService {
	/**
	 * Percentage of work completed. When not in progress, the value is null
	 */
	private static progress: number | null = null;

	private static getFullTableName(table: { name: string; schema: string }): string {
		return `${table.schema}_${table.name}`;
	}

	/**
	 * We can only add one permission per table per operation per role
	 * So we need to merge multiple permissions into one
	 * We can do this if
	 *    - the rowPermissions are identical
	 *    - one rowPermission has no checks and the other does for the same array of columns
	 *    - row permissions have the same checks for different column arrays, we can just union the columns then
	 * @param segmentedTablePermissions
	 * @return list of permissions
	 */
	private static mergePermissions(
		segmentedTablePermissions: SegmentedTablePermissions
	): FinalRowPermission[] {
		const resolvedRowPermissions: FinalRowPermission[] = [];

		forEach(segmentedTablePermissions, (userGroupPermissions, userGroup: string) => {
			forEach(userGroupPermissions, (tablePermissions) => {
				forEach(tablePermissions, (operationPermissions) => {
					if (operationPermissions.length > 1) {
						// Merge permissions using simplified algorithm.
						// This is far from ideal, but should be better than no permission checks at all
						// If we try to merge the permissions in an intelligent way, we run against the limitation of the graphql engine:
						// https://github.com/hasura/graphql-engine/issues/3442
						resolvedRowPermissions.push({
							...operationPermissions[0],
							userGroup,
							columns: uniq(
								flatten(
									operationPermissions.map((permission) => permission.columns)
								)
							).sort(),
							check_columns: uniqWith(
								compact(
									operationPermissions.map(
										(permission) => permission.check_columns
									)
								),
								isEqual
							),
						});
					}
				});
			});
		});

		return resolvedRowPermissions;
	}

	public static getProgress(): number | null {
		return this.progress;
	}

	/**
	 * Removes all existing permissions in the hasura database and
	 * inserts the new permissions based on the ROW_PERMISSIONS array
	 */
	public static async updateRowPermissions() {
		if (!isNil(this.progress)) {
			return this.progress;
		}

		this.progress = 1;

		try {
			// Convert list of permissions by permissionName to list of permissions by table and operation
			const segmentedTablePermissions: SegmentedTablePermissions = {};

			// Get permission list per role
			logger.info(`[PERMISSIONS] Fetching avo permissions per user group`);
			const permissionsPerUserGroup = await this.getPermissionsPerUserGroup();

			// Get columns for each table in the ROW_PERMISSIONS
			logger.info(`[PERMISSIONS] Fetching database columns`);
			const tables = flatten(compact(values(ROW_PERMISSIONS))).map(
				(permission) => permission.table
			);
			const columnsPerTable: { [tableName: string]: string[] } = await this.getColumnNames(
				tables.map(this.getFullTableName)
			);

			// Link permission info to each permission
			logger.info(`[PERMISSIONS] Building permissions list`);
			forEach(
				permissionsPerUserGroup,
				(permissionNames: PermissionName[], userGroup: string) => {
					// Init user group key if it doesn't exist yet
					if (!segmentedTablePermissions[userGroup]) {
						segmentedTablePermissions[userGroup] = {} as {
							[tableName: string]: {
								[operationName in Partial<TableOperation>]: ResolvedRowPermission[];
							};
						};
					}
					permissionNames.forEach((permissionName) => {
						const rowPermissions = (ROW_PERMISSIONS as any)[permissionName] as
							| RowPermission[]
							| null;
						if (!rowPermissions) {
							return;
						}
						rowPermissions.forEach((rowPermission) => {
							// Init table key if it doesn't exist yet
							const fullTableName = this.getFullTableName(rowPermission.table);
							if (!segmentedTablePermissions[userGroup][fullTableName]) {
								segmentedTablePermissions[userGroup][fullTableName] = {} as {
									[operationName in Partial<
										TableOperation
									>]: ResolvedRowPermission[];
								};
							}
							const operations: TableOperation[] = isString(rowPermission.operation)
								? [rowPermission.operation]
								: rowPermission.operation;

							operations.forEach((operation) => {
								// Init operation name if it doesn't exist yet
								if (
									!segmentedTablePermissions[userGroup][fullTableName][operation]
								) {
									segmentedTablePermissions[userGroup][fullTableName][
										operation
									] = [] as ResolvedRowPermission[];
								}

								// Resolve columns to array of strings
								let columns: string[];
								if (isFunction(rowPermission.columns)) {
									columns = rowPermission.columns(columnsPerTable[fullTableName]);
								} else if (!rowPermission.columns) {
									columns = columnsPerTable[fullTableName];
								} else {
									columns = rowPermission.columns;
								}

								segmentedTablePermissions[userGroup][fullTableName][operation].push(
									{
										...rowPermission,
										operation,
										columns,
									}
								);
							});
						});
					});
				}
			);

			logger.info(`[PERMISSIONS] Merging similar permissions`);
			const finalPermissions: FinalRowPermission[] = sortBy(
				this.mergePermissions(segmentedTablePermissions),
				[
					(permission: RowPermission) => this.getFullTableName(permission.table),
					'operation',
					'userGroup',
				]
			);

			this.progress = 10;

			logger.info(`[PERMISSIONS] Remove permissions from hasura`);
			for (let i = 0; i < finalPermissions.length; i += 1) {
				await this.setPermissionInDatabase(finalPermissions[i], 'drop');
				this.progress = Math.round((i / finalPermissions.length) * 45); // Delete takes 45% of the time
			}
			logger.info(`[PERMISSIONS] Insert permissions into hasura`);
			const insertedPermissions = [];
			for (let i = 0; i < finalPermissions.length; i += 1) {
				insertedPermissions.push(
					await this.setPermissionInDatabase(finalPermissions[i], 'create')
				);
				this.progress = Math.round(50 + (i / finalPermissions.length) * 45); // Insert takes 45% of the time
			}

			logger.info(`[PERMISSIONS] Writing logs`);
			const outputFile = path.join(__dirname, 'permissions.json');
			await fs.writeFile(outputFile, JSON.stringify(insertedPermissions, null, 2));

			logger.info(
				`[PERMISSIONS] updating permissions: ... done. Full permission list: ${outputFile}`
			);
		} finally {
			this.progress = null;
		}
	}

	private static getPermissionBody(
		permission: FinalRowPermission,
		createOrDrop: 'create' | 'drop'
	): any {
		let check: any;
		if (!permission.check_columns || permission.check_columns.length === 0) {
			check = {};
		} else if (permission.check_columns.length === 1) {
			check = permission.check_columns[0];
		} else {
			check = {
				$or: permission.check_columns,
			};
		}

		// Make call to database to set the permission
		let permissionBody;
		switch (permission.operation) {
			case 'insert':
				permissionBody = {
					check,
					columns: permission.columns,
				};
				break;

			case 'select':
				permissionBody = {
					filter: check,
					columns: permission.columns,
					limit: LIMIT_ROWS,
					allow_aggregations: true,
				};
				break;

			case 'update':
				permissionBody = {
					filter: check,
					columns: permission.columns,
				};
				break;

			case 'delete':
			default:
				permissionBody = {
					filter: check,
				};
				break;
		}
		return {
			type: `${createOrDrop}_${permission.operation}_permission`,
			args: {
				table: permission.table,
				role: snakeCase(permission.userGroup),
				...(createOrDrop === 'create'
					? {
							permission: permissionBody,
					  }
					: {}),
			},
		};
	}

	private static async setPermissionInDatabase(
		permission: FinalRowPermission,
		createOrDrop: 'create' | 'drop'
	): Promise<any[]> {
		try {
			checkRequiredEnvs(['GRAPHQL_URL', 'GRAPHQL_SECRET']);

			const body = this.getPermissionBody(permission, createOrDrop);
			const response = await graphqlQueryRequest({
				method: 'POST',
				data: body,
				headers: {
					'x-hasura-admin-secret': process.env.GRAPHQL_SECRET,
				},
			});

			logger.info(
				[
					'[PERMISSIONS]',
					this.getFullTableName(permission.table),
					permission.operation,
					permission.userGroup,
				].join(' '),
				response.data
			);

			return body;
		} catch (err) {
			if (
				createOrDrop === 'drop' &&
				get(err, 'response.data.error', '').endsWith('does not exist')
			) {
				// Ignore errors for dropping permissions that do not exist
				return;
			}
			throw new CustomError('Failed to add a permission to the database', err, {
				permission,
				createOrDrop,
			});
		}
	}

	private static async getPermissionsPerUserGroup(): Promise<{
		[userGroup: string]: PermissionName[];
	}> {
		try {
			checkRequiredEnvs(['GRAPHQL_URL', 'GRAPHQL_SECRET']);

			// Fetch user groups with their permissions from graphql database
			const body = {
				query: `query getPermissionsPerUserGroup {
  users_groups {
    label
    group_user_permission_groups {
      permission_group {
        permission_group_user_permissions {
          permission {
            label
          }
        }
      }
    }
  }
}
`,
			};
			const response = await graphqlQueryRequest({
				url: process.env.GRAPHQL_URL,
				method: 'POST',
				data: body,
			});

			// Convert database response to simple dictionary lookup
			if (response.data.errors) {
				throw new CustomError('graphQL response contains errors', response);
			}
			const userGroups: UsersGroup[] = response.data.users_groups;
			return fromPairs(
				userGroups.map((userGroup): [string, PermissionName[]] => [
					userGroup.label,
					flatten(
						userGroup.group_user_permission_groups.map((userGroup): PermissionName[] =>
							userGroup.permission_group.permission_group_user_permissions.map(
								(permissions): PermissionName =>
									permissions.permission.label as PermissionName
							)
						)
					),
				])
			);
		} catch (err) {
			throw new CustomError(
				'Failed to get permissions per user group from the database',
				err
			);
		}
	}

	/**
	 * Get column names for the columns in the specified database tables
	 * @param tableNames list of table names to get the columns for
	 * @return key value pair, where the key is the table name and the value is the list of column names
	 */
	private static async getColumnNames(
		tableNames: string[]
	): Promise<{ [tableName: string]: string[] }> {
		try {
			checkRequiredEnvs(['GRAPHQL_URL', 'GRAPHQL_SECRET']);

			// Get all columns for all tables with one query
			const uniqueTableNames = uniq(tableNames);
			const queryBody = uniqueTableNames
				.map(
					(tableName) =>
						`${tableName}: __type(name: "${tableName}") { fields { name, type { name, ofType { name } } } }`
				)
				.join('\n');
			const response: any = await graphqlQueryRequest({
				url: process.env.GRAPHQL_URL,
				method: 'POST',
				data: {
					query: `query getColumns{${queryBody}}`,
				},
			});

			// Convert database response to simple dictionary lookup
			return fromPairs(
				map(response.data, (value: { fields: IntrospectionField[] }, tableName): [
					string,
					string[]
				] => {
					return [
						tableName,
						compact(
							value.fields
								.filter((field: IntrospectionField) => {
									return (
										GRAPHQL_SIMPLE_TYPES.includes(get(field, 'type.name')) ||
										GRAPHQL_SIMPLE_TYPES.includes(
											get(field, 'type.ofType.name')
										)
									);
								})
								.map((field: IntrospectionField): string | null => {
									return field.name;
								})
						),
					];
				})
			);
		} catch (err) {
			throw new CustomError('Failed to get column names for table from the database', err);
		}
	}
}
