import { Path, GET, Context, ServiceContext } from 'typescript-rest';
import { NotFoundError } from 'typescript-rest/dist/server/model/errors';

@Path('/')
export default class FallbackRoute {
	@Context
	context: ServiceContext;

	@GET
	@Path('/*')
	fallback() {
		throw new NotFoundError(`Route not found: ${this.context.request.path}`);
	}
}
