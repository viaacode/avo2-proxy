import SearchController from './controller';
import { Path, POST, FormParam } from 'typescript-rest';
import { IFilterResponse, IFilters } from './types';

@Path('/search')
export default class SearchRoute {

	@Path('filter')
	@POST
	filter(
			@FormParam('filters') filters: any,
			@FormParam('from') from: number,
			@FormParam('size') size: number,
	): IFilterResponse {
		return SearchController.filter(filters, from, size);
	}

}
