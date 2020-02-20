export const GET_KLAAR_NEWSLETTER_CONTENT_PAGE = `
	query getKlaarNewsletterContentPage($path: String!) {
		app_content(where: {path: {_eq: $path}}) {
			contentBlockssBycontentId(order_by: {position: asc}) {
				variables
				content_block_type
				content_id
			}
			title
			description
      updated_at
		}
	}
`;
