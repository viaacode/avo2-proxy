import { Path, GET, Errors } from 'typescript-rest';

@Path('/')
export default class FallbackRoute {

	@GET
	@Path('*')
	fallback() {
		throw new Errors.NotFoundError('Not found');
	}
}
