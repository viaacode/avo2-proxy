/**
 * This script runs over all files that match *.gql.ts and extracts the gql queries and whitelists them into the graphql database
 */
import axios, { AxiosResponse } from 'axios';
import glob from 'glob';
import { get, intersection, intersectionBy, keys, map, noop, values } from 'lodash';
import * as path from 'path';

const fs = require('fs-extra');

import { logger } from '../src/shared/helpers/logger';

if (!process.env.GRAPHQL_URL) {
	logger.error(
		'Failed to whitelist graphql queries because environment variable GRAPHQL_URL is not set'
	);
}
if (!process.env.GRAPHQL_SECRET) {
	logger.error(
		'Failed to whitelist graphql queries because environment variable GRAPHQL_SECRET is not set'
	);
}

async function fetchPost(body: any) {
	const url = `${process.env.GRAPHQL_URL.replace('/v1/graphql', '/v1/query')}`;
	const response: AxiosResponse<any> = await axios(url, {
		method: 'post',
		headers: {
			'x-hasura-admin-secret': process.env.GRAPHQL_SECRET as string,
		},
		data: body,
	});
	const errors = get(response, 'data.errors');
	if (errors) {
		logger.error('Failed to insert event into the database', {
			url,
			errors,
		});
	}
	return response.data;
}

function getGraphqlQueryName(query: string): string {
	return query.split(/[{(]/)[0].trim().split(' ').pop().trim();
}

function getWhitelistQueries(gqlRegex: RegExp): Promise<Record<string, string>> {
	return new Promise<Record<string, string>>((resolve, reject) => {
		const options = {
			cwd: path.join(__dirname, '../src'),
		};

		glob('**/*.gql.ts', options, async (err, files) => {
			const queries: { [queryName: string]: string } = {};

			try {
				if (err) {
					logger.error('Failed to find files using **/*.gql.ts', err);
					return;
				}

				// Find and extract queries
				files.forEach((relativeFilePath: string) => {
					try {
						const absoluteFilePath = `${options.cwd}/${relativeFilePath}`;
						const content: string = fs.readFileSync(absoluteFilePath).toString();

						let matches: RegExpExecArray | null;
						do {
							matches = gqlRegex.exec(content);
							if (matches) {
								const name = matches[1];
								const query = matches[2];
								if (query.includes('${')) {
									logger.warn(
										`Extracting graphql queries with javascript template parameters isn't supported: ${name}`
									);
								}

								if (queries[name]) {
									reject(
										`Query with the same label is found twice. This will cause a conflicts in the query whitelist: ${name}`
									);
								}

								// Remove new lines and tabs
								// Trim whitespace
								queries[name] = query.replace(/[\t\r\n]+/gm, ' ').trim();
							}
						} while (matches);
					} catch (err) {
						logger.error(`Failed to find queries in file: ${relativeFilePath}`, err);
					}
				});

				resolve(queries);
			} catch (err) {
				logger.error('Failed to extract and upload graphql query whitelist', err);

				reject(err);
			}
		});
	});
}

async function refreshWhitelistInDatabase(
	collectionName: string,
	collectionDescription: string,
	queries: Record<string, string>
) {
	// Remove the query collection from the whitelist in graphsl
	try {
		await fetchPost({
			type: 'drop_collection_from_allowlist',
			args: {
				collection: collectionName,
			},
		});
	} catch (err) {
		// Ignore error if query collection doesn't exist
		if (get(err, 'response.data.code') !== 'not-exists') {
			throw err;
		}
	}
	logger.info('[QUERY WHITELISTING]: Removed from whitelist');

	// Delete the client whitelist collection in graphql
	try {
		await fetchPost({
			type: 'drop_query_collection',
			args: {
				collection: collectionName,
				cascade: false,
			},
		});
	} catch (err) {
		// Ignore error if query collection doesn't exist
		if (get(err, 'response.data.code') !== 'not-exists') {
			throw err;
		}
	}
	logger.info('[QUERY WHITELISTING]: Deleted collection');

	// Recreate the client whitelist collection in graphql
	await fetchPost({
		type: 'create_query_collection',
		args: {
			name: collectionName,
			comment: collectionDescription,
			definition: {
				queries: map(queries, (query: string, name: string) => ({
					name,
					// Remove query name
					query: query.replace(/^(query|mutation)\s?[^({]+([({])/gm, '$1 $2'),
				})),
			},
		},
	});
	logger.info('[QUERY WHITELISTING]: Recreated collection');

	// Add query collection to whitelist
	await fetchPost({
		type: 'add_collection_to_allowlist',
		args: {
			collection: collectionName,
		},
	});
	logger.info('[QUERY WHITELISTING]: Re-added collection to whitelist');

	const outputFile = path.join(__dirname, 'uploaded-whitelist.json');
	await fs.writeFile(outputFile, JSON.stringify(queries, null, 2));

	logger.info(
		`[QUERY WHITELISTING]: Whitelisted ${
			Object.keys(queries).length
		} queries in the graphql database. Full list: ${outputFile}`
	);
}

async function whitelistQueries() {
	try {
		const proxyQueries: Record<string, string> = await getWhitelistQueries(
			/const ([^\s]+) = `([^`]+?)`/gm
		);

		const outputFile = path.join(__dirname, 'proxy-whitelist.json');
		await fs.writeFile(outputFile, JSON.stringify(proxyQueries, null, 2));

		const clientQueries: Record<string, string> = JSON.parse(
			fs.readFileSync(path.join(__dirname, 'client-whitelist.json'))
		);

		const labelCollisions = intersection(keys(proxyQueries), keys(clientQueries));
		const labelCollisionsThatAreNotIdentical = labelCollisions.filter(
			(label) => clientQueries[label] !== proxyQueries[label]
		);

		if (labelCollisionsThatAreNotIdentical.length) {
			logger.error(
				`Client and proxy have queries with the same name: ${labelCollisionsThatAreNotIdentical.join(
					', '
				)}`
			);
			return;
		}

		const allQueries = { ...clientQueries, ...proxyQueries };
		await refreshWhitelistInDatabase(
			'allowed-queries',
			'All queries the avo2 client and server are allowed to execute',
			allQueries
		);
		logger.info(`Updating whitelist with ${keys(allQueries).length} queries`);
	} catch (err) {
		logger.error(`Failed to whitelist queries: ${JSON.stringify(err)}`);
	}
}

whitelistQueries().then(noop);
