import { Context, Path, ServiceContext, QueryParam, GET, Return } from 'typescript-rest';
import { IdpHelper } from '../../idp-helper';

@Path('/auth/klascement')
export default class KlascementRoute {
	@Context
	context: ServiceContext;

	@Path('logout')
	@GET
	async logout(@QueryParam('returnToUrl') returnToUrl: string): Promise<any> {
		IdpHelper.logout(this.context.request);
		return new Return.MovedTemporarily(returnToUrl);
	}
}
