import { Path, GET } from 'typescript-rest';
import { NotFoundError } from 'typescript-rest/dist/server/model/errors';

@Path('/')
export default class FallbackRoute {

	@GET
	@Path('/*')
	fallback() {
		throw new NotFoundError('Not found');
	}
}
