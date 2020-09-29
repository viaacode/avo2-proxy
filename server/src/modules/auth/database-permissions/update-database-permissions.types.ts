import { RowPermission, TableOperation } from './row-permissions';

export interface UsersGroup {
	label: string;
	group_user_permission_groups: GroupUserPermissionGroup[];
}

export interface GroupUserPermissionGroup {
	permission_group: PermissionGroup;
}

export interface PermissionGroup {
	permission_group_user_permissions: PermissionGroupUserPermission[];
}

export interface PermissionGroupUserPermission {
	permission: Permission;
}

export interface Permission {
	label: string;
}

export interface IntrospectionField {
	name: string;
	type: {
		name: string;
		ofType: {
			name: string;
		};
	};
}

export type SegmentedTablePermissions = {
	[userGroup: string]: {
		[tableName: string]: {
			[operationName in Partial<TableOperation>]: ResolvedRowPermission[];
		};
	};
};

export interface ResolvedRowPermission extends RowPermission {
	columns: string[];
}

export interface FinalRowPermission extends ResolvedRowPermission {
	userGroup: string;
}

export type TableOperation = 'insert' | 'update' | 'delete' | 'select';

export type ColumnCheck = { [columnName: string]: any };
