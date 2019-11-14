import { Request } from 'express';
import { Context, GET, Path, QueryParam, Return, ServiceContext } from 'typescript-rest';
import { LdapUser } from '../../types';
import { IdpHelper } from '../../idp-adapter';
import HetArchiefService from '../hetarchief/service';
import { logger } from '../../../../shared/helpers/logger';
import { CustomError } from '../../../../shared/helpers/error';

export default class KlascementController {
	@Context
	context: ServiceContext;

	public static isLoggedIn(request: Request): boolean {
		return false;
	}
}
