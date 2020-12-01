import axios, { AxiosResponse } from 'axios';
import { keys } from 'lodash';
import path from 'path';

import { Avo } from '@viaa/avo2-types';

import { checkRequiredEnvs } from '../../shared/helpers/env-check';
import { CustomError, InternalServerError } from '../../shared/helpers/error';
import { logger } from '../../shared/helpers/logger';

import { QUERY_PERMISSIONS } from './data.permissions';

const fs = require('fs-extra');

checkRequiredEnvs(['GRAPHQL_URL']);

export default class DataService {
	private static clientWhitelist: { [queryName: string]: string };
	private static proxyWhitelist: { [queryName: string]: string };

	static async initialize() {
		const clientWhitelistPath = path.join(__dirname, '../../../scripts/client-whitelist.json');
		const proxyWhitelistPath = path.join(__dirname, '../../../scripts/proxy-whitelist.json');
		try {
			this.clientWhitelist = JSON.parse(await fs.readFile(clientWhitelistPath));
			this.proxyWhitelist = JSON.parse(await fs.readFile(proxyWhitelistPath));
		} catch (err) {
			throw new InternalServerError('Failed to read whitelists', err, {
				clientWhitelistPath,
				proxyWhitelistPath,
			});
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
			const response: AxiosResponse<any> = await axios(url, {
				data,
				method: 'post',
				headers: {
					...headers,
					'x-hasura-admin-secret': process.env.GRAPHQL_SECRET,
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
	): Promise<boolean | null> {
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
			const isAllowed = await QUERY_PERMISSIONS[type][queryName](user, query, variables);
			return isAllowed;
		} catch (err) {
			logger.error(
				new InternalServerError(
					'Failed to check if query can be executed, defaulting to false',
					err,
					{ user, query, variables, type }
				)
			);
			return false;
		}
	}
}
