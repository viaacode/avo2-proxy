export const GET_TRANSLATIONS = `
	query getTranslations($name: String!) {
		app_site_variables(where: {name: {_ilike: $name }}) {
			name
			value
		}
	}
`;
