import { get, isNil, uniq } from 'lodash';
import { Context, Path, POST, PreProcessor, ServiceContext } from 'typescript-rest';

import type { Avo } from '@viaa/avo2-types';

import { BadRequestError, InternalServerError } from '../../shared/helpers/error';
import { logger } from '../../shared/helpers/logger';
import { isAuthenticatedRouteGuard } from '../../shared/middleware/is-authenticated';
import { PermissionName } from '../../shared/permissions';
import { IdpHelper } from '../auth/idp-helper';
import { AuthService } from '../auth/service';
import EventLoggingController from '../event-logging/controller';

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
	async updateProfile(variables: UpdateProfileValues): Promise<void> {
		try {
			const loggedInUser: Avo.User.User | null = IdpHelper.getAvoUserInfoFromSession(
				this.context.request
			);

			// Either this is a user trying to edit their own profile
			// Or a admin trying to change someone else his profile
			let userToEdit = loggedInUser;
			if (variables.userId !== loggedInUser.uid) {
				if (!AuthService.hasPermission(loggedInUser, PermissionName.EDIT_ANY_USER)) {
					throw new BadRequestError(
						'You do not have the required permissions to edit this user'
					);
				} else {
					userToEdit = await AuthService.getAvoUserInfoById(variables.userId);
				}
			} else {
				userToEdit = loggedInUser;
			}

			if (!userToEdit) {
				throw new BadRequestError(
					'Cannot update profile since no logged in user was found on the session'
				);
			}
			if (!userToEdit.profile) {
				throw new BadRequestError(
					'Cannot update profile since no profile is linked to the logged in user'
				);
			}
			const newProfileValues: Partial<UpdateProfileValues> = await ProfileController.updateProfile(
				userToEdit,
				variables
			);
			const userGroupId: number | undefined = uniq(
				get(userToEdit, 'profile.userGroupIds', []) as number[]
			)[0];
			if (isNil(userGroupId)) {
				throw new InternalServerError(
					"Failed to update user groups because user doesn't have a user group",
					null,
					{ userToEdit }
				);
			}
			await ProfileController.updateUserGroupsSecondaryEducation(
				userGroupId,
				userToEdit.profile.id,
				(newProfileValues.educationLevels || []).map((lvl) => lvl.key) // Could have been updated by the update profile function
			);

			const updatedAvoUser = await AuthService.getAvoUserInfoById(userToEdit.uid);
			const idpObject = updatedAvoUser.idpmapObjects.find(
				(idpObject: { idp: Avo.Auth.IdpType }) => idpObject.idp === 'HETARCHIEF'
			);
			if (idpObject) {
				const ldapEntryUuid = idpObject.idp_user_id;
				if (ldapEntryUuid) {
					await AuthService.updateLdapUserInfo(updatedAvoUser, ldapEntryUuid);
				} else {
					logger.error(
						'Failed to update user info in ldap, because ldap object on session does not contain an entryUUID',
						null,
						{ ldapEntryUuid }
					);
				}
			}
			IdpHelper.setAvoUserInfoOnSession(this.context.request, updatedAvoUser);
			EventLoggingController.insertEvent(
				{
					object: updatedAvoUser.uid,
					object_type: 'account',
					message: `${get(updatedAvoUser, 'first_name')} ${get(
						updatedAvoUser,
						'last_name'
					)} heeft zijn account geupdate`,
					action: 'edit',
					subject: updatedAvoUser.uid,
					subject_type: 'user',
					occurred_at: new Date().toISOString(),
					source_url: process.env.HOST + this.context.request.path,
				},
				this.context.request
			);
		} catch (err) {
			if (
				JSON.stringify(err).includes(
					'Uniqueness violation. duplicate key value violates unique constraint \\"user_profiles_alias_key\\"'
				)
			) {
				throw new BadRequestError('DUPLICATE_ALIAS');
			}
			const error = new InternalServerError('Failed to update profile', err);
			logger.error(error);
			throw new InternalServerError(error.message);
		}
	}
}
