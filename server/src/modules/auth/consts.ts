import type { Avo } from '@viaa/avo2-types';

import isLoggedInHetArchief from './idps/hetarchief/is-logged-in';
import isLoggedInKlascement from './idps/klascement/is-logged-in';
import { KlascementUserInfo } from './idps/klascement/service';
import isLoggedInSmartschool from './idps/smartschool/is-logged-in';
import { SmartschoolUserInfo } from './idps/smartschool/service';
import { IdpInterface } from './types';

export const ACCEPTED_TERMS_OF_USE_AND_PRIVACY_CONDITIONS =
	'ACCEPTED_TERMS_OF_USE_AND_PRIVACY_CONDITIONS';

export const IDP_ADAPTERS: { [idpType in Exclude<Avo.Auth.IdpType, 'VIAA'>]: IdpInterface } = {
	HETARCHIEF: {
		isLoggedIn: isLoggedInHetArchief,
		logoutPath: 'auth/hetarchief/logout',
	},
	SMARTSCHOOL: {
		isLoggedIn: isLoggedInSmartschool,
		logoutPath: 'auth/smartschool/logout',
		loginPath: 'auth/smartschool/login', // Used for linking accounts
		getUserId: (idpUserInfo: SmartschoolUserInfo): string => idpUserInfo.userID,
	},
	KLASCEMENT: {
		isLoggedIn: isLoggedInKlascement,
		logoutPath: 'auth/klascement/logout',
		loginPath: 'auth/klascement/login', // Used for linking accounts
		getUserId: (idpUserInfo: KlascementUserInfo): string => idpUserInfo.id,
	},
};

export enum SpecialUserGroup {
	Admin = 1,
	Teacher = 2,
	TeacherSecondary = 3,
	Pupil = 4,
	StudentTeacher = 23,
	StudentTeacherSecondary = 5,
}
