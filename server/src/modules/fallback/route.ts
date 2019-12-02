import { Path, GET, Context, ServiceContext } from 'typescript-rest';
import { NotFoundError } from '../../shared/helpers/error';

@Path('/')
export default class FallbackRoute {
	@Context
	context: ServiceContext;

	@GET
	@Path('/*')
	fallback() {
		throw new NotFoundError('Route not found', null, { route: this.context.request.path });
	}
}
