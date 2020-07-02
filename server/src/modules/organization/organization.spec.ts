import 'jest';

import OrganisationService, { OrganisationInfo } from './service';

const VRT = {
	or_id: 'OR-rf5kf25',
	cp_name: 'VRT',
	category: 'Content Partner',
	sector: 'Publieke Omroep',
	cp_name_catpro: 'VRT',
	description:
		'De Vlaamse Radio- en Televisieomroeporganisatie, afgekort VRT, is de Nederlandstalige openbare omroep voor radio en televisie in België.',
	accountmanager: 'Debbie Esmans',
	contact_information: {
		phone: '+32 2 741 37 20',
		website: 'https://www.vrt.be',
		email: 'beeldarchief@vrt.be',
		logoUrl: 'https://assets.viaa.be/images/OR-rf5kf25',
		form_url:
			'https://4cdev-vrtklantendienst.cs84.force.com/s/contactus?name_user=' +
			'{first_name}&mail_user={email}&local_id={local_cp_id}&viaa_id={pid}&surname_user={last_name}',
	},
};
