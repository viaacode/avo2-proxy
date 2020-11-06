import { Context, DELETE, GET, Path, POST, PUT, ServiceContext } from 'typescript-rest';

import { NotFoundError } from '../../shared/helpers/error';

@Path('/')
export default class FallbackRoute {
	@Context
	context: ServiceContext;

	// If routes are not found, check the import order in app.ts, the fallback route has to be imported as the last route.

	@GET
	@Path('/*')
	fallbackGet() {
		throw new NotFoundError('Route not found', null, {
			route: this.context.request.path,
			method: 'GET',
		});
	}

	@POST
	@Path('/*')
	fallbackPost() {
		throw new NotFoundError('Route not found', null, {
			route: this.context.request.path,
			method: 'POST',
		});
	}

	@PUT
	@Path('/*')
	fallbackPut() {
		throw new NotFoundError('Route not found', null, {
			route: this.context.request.path,
			method: 'PUT',
		});
	}

	@DELETE
	@Path('/*')
	fallbackDelete() {
		throw new NotFoundError('Route not found', null, {
			route: this.context.request.path,
			method: 'DELETE',
		});
	}
}
