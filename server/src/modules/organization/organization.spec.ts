import 'jest';
import OrganizationService, { OrganizationInfo } from './service';

const VRT = {
	or_id: 'OR-rf5kf25',
	cp_name: 'VRT',
	category: 'Content Partner',
	sector: 'Publieke Omroep',
	cp_name_catpro: 'VRT',
	description: 'De Vlaamse Radio- en Televisieomroeporganisatie, afgekort VRT, is de Nederlandstalige openbare omroep voor radio en televisie in België.',
	accountmanager: 'Debbie Esmans',
	contact_information: {
		phone: '+32 2 741 37 20',
		website: 'https://www.vrt.be',
		email: 'beeldarchief@vrt.be',
		logoUrl: 'https://assets.viaa.be/images/OR-rf5kf25',
		form_url: 'https://4cdev-vrtklantendienst.cs84.force.com/s/contactus?name_user=' +
			'{first_name}&mail_user={email}&local_id={local_cp_id}&viaa_id={pid}&surname_user={last_name}',
	},
};

describe('Organization api', () => {
	it('should return null if cache hasn\'t been initialized', async () => {
		const orgInfo: OrganizationInfo | null = OrganizationService.getOrganisationInfo(VRT.or_id);
		expect(orgInfo).toBeNull();
	});

	it('should get an organization\'s info by org_id', async () => {
		await OrganizationService.initialize();
		const orgInfo: OrganizationInfo | null = OrganizationService.getOrganisationInfo(VRT.or_id);
		expect(orgInfo.cp_name).toEqual(VRT.cp_name);
		expect(orgInfo.cp_name_catpro).toEqual(VRT.cp_name_catpro);
	});

	it('should return null if organization isn\'t found', async () => {
		await OrganizationService.initialize();
		const orgInfo: OrganizationInfo | null = OrganizationService.getOrganisationInfo('abc');
		expect(orgInfo).toBeNull();
	});

	it('should return null if passed org id is null', async () => {
		await OrganizationService.initialize();
		const orgInfo: OrganizationInfo | null = OrganizationService.getOrganisationInfo(null);
		expect(orgInfo).toBeNull();
	});
});
