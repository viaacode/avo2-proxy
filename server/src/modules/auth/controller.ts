import _ from 'lodash';
import HetArchiefController from './idps/hetarchief/controller';
import SmartschoolController from './idps/smartschool/controller';
import { Request } from 'express';
import { IdpHelper } from './idp-adapter';

const IDP_ADAPTERS = [
	HetArchiefController,
	SmartschoolController,
];

export default class AuthController {
	public static isAuthenticated(req: Request) {
		return _.some(IDP_ADAPTERS, adapter => adapter.isLoggedIn(req));
	}

	public static logout(req: Request) {
		IdpHelper.setIdpUserInfoOnSession(req, null, null);
		IdpHelper.setAvoUserInfoOnSession(req, null);
	}
}
