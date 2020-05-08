import { GET, Path } from 'typescript-rest';

import StatusController from './controller';
import { IStatusResponse } from './types';

@Path('/')
export default class StatusRoute {

	@GET
	@Path('status')
	status(): IStatusResponse {
		return StatusController.status();
	}

	@GET
	@Path('/')
	statusRoot(): IStatusResponse {
		return StatusController.status();
	}
}
