import { RecursiveError } from '../helpers/recursiveError';
import { GraphQLClient } from 'graphql-request';

export class GraphQlService {
	public static getGraphQlClient: Promise<GraphQLClient>;

	public static async initialize() {
		this.getGraphQlClient = new Promise<GraphQLClient>(async (resolve, reject) => {
			try {
				const endpoint = process.env.GRAPHQL_URL as string;

				const graphQlClient = new GraphQLClient(endpoint, {
					headers: {
						'x-hasura-admin-secret': process.env.GRAPHQL_SECRET as string,
					},
				});

				resolve(graphQlClient);
			} catch (err) {
				reject(new RecursiveError('Failed to initialize the graphql client', err));
			}
		});
	}

	public static async request<T>(query: string, variables?: any): Promise<T> {
		try {
			const graphqlClient: GraphQLClient = await this.getGraphQlClient;
			const response = await graphqlClient.request(query, variables);
			return response;
		} catch (err) {
			throw new RecursiveError('Failed to make query to graphql', err, { query, variables });
		}
	}
}
