import { get } from 'lodash';
import { Context, Path, POST, PreProcessor, ServiceContext } from 'typescript-rest';

import { Avo } from '@viaa/avo2-types';

import { BadRequestError, InternalServerError } from '../../shared/helpers/error';
import { logger } from '../../shared/helpers/logger';
import { isAuthenticatedRouteGuard } from '../../shared/middleware/is-authenticated';
import { IdpHelper } from '../auth/idp-helper';
import { AuthService } from '../auth/service';
import { LdapUser } from '../auth/types';

import ProfileController, { UpdateProfileValues } from './controller';

@Path('/profile')
export default class ProfileRoute {
	@Context
	context: ServiceContext;

	/**
	 * Update profile info
	 * This is implemented as a separate route from the data route
	 * since we need to check the education levels property to add/remove this user to the "lesgever secundair" if need be
	 */
	@Path('')
	@POST
	@PreProcessor(isAuthenticatedRouteGuard)
	async updateProfile(variables: UpdateProfileValues): Promise<any> {
		try {
			const user: Avo.User.User | null = IdpHelper.getAvoUserInfoFromSession(
				this.context.request
			);
			if (!user) {
				throw new BadRequestError(
					'Cannot update profile since no logged in user was found on the session'
				);
			}
			if (!user.profile) {
				throw new BadRequestError(
					'Cannot update profile since no profile is linked to the logged in user'
				);
			}
			await ProfileController.updateProfile(user.profile, variables);
			const updatedAvoUser = await AuthService.getAvoUserInfoById(user.uid);
			const idpType = IdpHelper.getIdpTypeFromSession(this.context.request);
			if (idpType === 'HETARCHIEF') {
				const ldapUser: LdapUser = IdpHelper.getIdpUserInfoFromSession(
					this.context.request
				);
				const ldapEntryUuid = get(ldapUser, 'attributes.entryUUID[0]');
				if (ldapEntryUuid) {
					await AuthService.updateLdapUserInfo(updatedAvoUser, ldapEntryUuid);
				} else {
					logger.error(
						'Failed to update user info in ldap, because ldap object on session does not contain an entryUUID',
						null,
						{ ldapUser }
					);
				}
			}
			IdpHelper.setAvoUserInfoOnSession(this.context.request, updatedAvoUser);
		} catch (err) {
			const error = new InternalServerError('Failed to update profile', err);
			logger.error(error);
			throw new InternalServerError(error.message);
		}
	}
}
