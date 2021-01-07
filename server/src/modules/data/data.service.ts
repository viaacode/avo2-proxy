import axios, { AxiosResponse } from 'axios';
import { get, isEmpty, keys, omitBy, without } from 'lodash';
import path from 'path';

import type { Avo } from '@viaa/avo2-types';

import { checkRequiredEnvs } from '../../shared/helpers/env-check';
import { CustomError, ExternalServerError, InternalServerError } from '../../shared/helpers/error';
import { logger } from '../../shared/helpers/logger';

import { GET_ASSIGNMENT_OWNER, GET_COLLECTION_OWNER } from './data.gql';
import { QUERY_PERMISSIONS } from './data.permissions';
import { AuthTokenResponse } from './data.types';

const fs = require('fs-extra');

checkRequiredEnvs(['GRAPHQL_URL']);

export default class DataService {
	private static clientWhitelist: { [queryName: string]: string };
	private static proxyWhitelist: { [queryName: string]: string };

	private static authToken: string;
	private static authTokenExpire: Date;
	private static tokenPromise: Promise<string> | null;

	static async initialize() {
		const clientWhitelistPath = path.join(__dirname, '../../../scripts/client-whitelist.json');
		const proxyWhitelistPath = path.join(__dirname, '../../../scripts/proxy-whitelist.json');
		try {
			this.clientWhitelist = JSON.parse(await fs.readFile(clientWhitelistPath));
			this.proxyWhitelist = JSON.parse(await fs.readFile(proxyWhitelistPath));

			// Check missing permissions
			const missingClientPermissions = without(
				keys(this.clientWhitelist),
				...keys(QUERY_PERMISSIONS.CLIENT)
			);
			const oldClientPermissions = without(
				keys(QUERY_PERMISSIONS.CLIENT),
				...keys(this.clientWhitelist)
			);
			const missingProxyPermissions = without(
				keys(this.proxyWhitelist),
				...keys(QUERY_PERMISSIONS.PROXY)
			);
			const oldProxyPermissions = without(
				keys(QUERY_PERMISSIONS.PROXY),
				...keys(this.proxyWhitelist)
			);

			if (
				missingClientPermissions.length ||
				oldClientPermissions.length ||
				missingProxyPermissions.length ||
				oldProxyPermissions.length
			) {
				logger.error(
					`Some permissions need to be updated:${JSON.stringify(
						omitBy(
							{
								missingClientPermissions,
								oldClientPermissions,
								missingProxyPermissions,
								oldProxyPermissions,
							},
							isEmpty
						)
					)}`
				);
			}
		} catch (err) {
			throw new InternalServerError('Failed to read whitelists', err, {
				clientWhitelistPath,
				proxyWhitelistPath,
			});
		}
	}

	private static async getAuthTokenFromNetwork(): Promise<string> {
		let url: string | undefined;
		let data: { username: string; password: string } | undefined;
		try {
			// Fetch new token
			url = `${process.env.GRAPHQL_AUTH_SERVER_URL as string}/auth`;
			data = {
				username: process.env.GRAPHQL_AUTH_USERNAME as string,
				password: process.env.GRAPHQL_AUTH_PASSWORD as string,
			};
			const authTokenResponse: AxiosResponse<AuthTokenResponse> = await axios({
				url,
				data,
				method: 'post',
			});
			return authTokenResponse.data.authorization_token;
		} catch (err) {
			throw new InternalServerError('Failed to get JWT token from auth server', err, {
				url,
				username: data.username,
			});
		}
	}

	private static async getAuthToken(): Promise<string> {
		try {
			if (DataService.tokenPromise) {
				// Token call in progress, return the same promise that is in progress
				return DataService.tokenPromise;
			}

			if (!DataService.authToken || DataService.authTokenExpire < new Date()) {
				// We need to get a token the first time the search api is called or
				// when the token in the cache is expired
				DataService.tokenPromise = DataService.getAuthTokenFromNetwork();
				DataService.authToken = await DataService.tokenPromise;
				DataService.authTokenExpire = new Date(new Date().getTime() + 5 * 60 * 1000); // Refresh token every 5 min
				DataService.tokenPromise = null;
				return DataService.authToken;
			}
			// Return cached token
			return DataService.authToken;
		} catch (err) {
			DataService.tokenPromise = null;
			throw new ExternalServerError('Failed to get token for elasticsearch', err);
		}
	}

	static async execute(
		query: string,
		variables: { [varName: string]: any } = {},
		headers: { [headerName: string]: string } = {}
	): Promise<any> {
		let url;
		let data;
		try {
			url = process.env.GRAPHQL_URL as string;
			data = {
				query,
				variables,
			};
			let token: string;
			try {
				token = await DataService.getAuthToken();
			} catch (err) {
				logger.error(
					new ExternalServerError('Failed to get token for graphql, attempt 1', err)
				);
				try {
					token = await DataService.getAuthToken();
				} catch (err) {
					throw new ExternalServerError(
						'Failed to get token for graphql, attempt 2',
						err
					);
				}
			}

			const response: AxiosResponse<any> = await axios({
				url,
				data,
				method: 'post',
				headers: {
					...headers,
					// 'x-hasura-admin-secret': process.env.GRAPHQL_SECRET,
					Authorization: token,
				},
			});
			if (response.data.errors) {
				const error = new CustomError('GraphQL query failed', null, {
					query,
					variables,
					errors: response.data.errors,
				});
				logger.error('graphql error during data fetch route: ', error);
				throw error;
			}
			return response.data;
		} catch (err) {
			throw new InternalServerError('Failed to get data from database', err, {
				query,
				variables,
			});
		}
	}

	static async isAllowedToRunQuery(
		user: Avo.User.User,
		query: string,
		variables: any,
		type: 'CLIENT' | 'PROXY'
	): Promise<string | null> {
		try {
			const whitelist = type === 'CLIENT' ? this.clientWhitelist : this.proxyWhitelist;
			const queryStart = query.replace(/[\s]+/gm, ' ').split(/[{(]/)[0].trim();

			// Find query in whitelist by looking for the first part. eg: "query getUserGroups"
			const queryName = keys(whitelist).find(
				(key) => whitelist[key].split(/[{(]/)[0].trim() === queryStart
			);

			if (!queryName) {
				return null;
			}

			// Use the query from the whitelist instead of the one passed in the request body to avoid tampering
			const whitelistQuery = whitelist[queryName];

			const isAllowed = await QUERY_PERMISSIONS[type][queryName](
				user,
				whitelistQuery,
				variables
			);
			return isAllowed ? whitelistQuery : null;
		} catch (err) {
			throw new InternalServerError(
				'Failed to check if query can be executed, defaulting to false',
				err,
				{ user, query, variables, type }
			);
		}
	}

	private static async makeRequest(
		query: string,
		variables: any,
		resultPath: string
	): Promise<string> {
		try {
			const response = await DataService.execute(query, variables);
			if (response.errors) {
				throw new InternalServerError('graphql response contains errors', null, {
					response,
				});
			}
			return get(response, resultPath);
		} catch (err) {
			throw new InternalServerError('Failed to fetch from database', err, {
				query,
				variables,
			});
		}
	}

	static async getAssignmentOwner(assignmentUuid: string): Promise<string> {
		try {
			return DataService.makeRequest(
				GET_ASSIGNMENT_OWNER,
				{ assignmentUuid },
				'data.app_assignments[0].owner_profile_id'
			);
		} catch (err) {
			throw new InternalServerError('Failed to fetch assignment owner', err);
		}
	}

	static async getCollectionOwner(collectionId: number): Promise<string> {
		try {
			return DataService.makeRequest(
				GET_COLLECTION_OWNER,
				{ collectionId },
				'data.app_collections[0].owner_profile_id'
			);
		} catch (err) {
			throw new InternalServerError('Failed to fetch collection owner', err);
		}
	}
}
