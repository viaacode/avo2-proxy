export const GET_SITE_VARIABLES_BY_NAME = `
	query getSiteVariables($name: String!) {
		app_site_variables(where: {name: {_ilike: $name }}) {
			name
			value
		}
	}
`;
