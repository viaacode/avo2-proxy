import { Path, GET, Context, ServiceContext, POST, PUT, DELETE } from 'typescript-rest';

import { NotFoundError } from '../../shared/helpers/error';

@Path('/')
export default class FallbackRoute {
	@Context
	context: ServiceContext;

	@GET
	@Path('/*')
	fallbackGet() {
		throw new NotFoundError('Route not found', null, { route: this.context.request.path, method: 'GET' });
	}

	@POST
	@Path('/*')
	fallbackPost() {
		throw new NotFoundError('Route not found', null, { route: this.context.request.path, method: 'POST' });
	}

	@PUT
	@Path('/*')
	fallbackPut() {
		throw new NotFoundError('Route not found', null, { route: this.context.request.path, method: 'PUT' });
	}

	@DELETE
	@Path('/*')
	fallbackDelete() {
		throw new NotFoundError('Route not found', null, { route: this.context.request.path, method: 'DELETE' });
	}
}
