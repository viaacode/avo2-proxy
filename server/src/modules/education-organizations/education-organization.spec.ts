import 'jest';
import supertest from 'supertest';
import { App } from '../../app';
import { ClientEducationOrganization } from './route';

const api = supertest(new App(false).app);

describe('Education organizations ldap api', () => {
	it('cities: should return a list of cities', async () => {
		const response = await api
			.get('/education-organizations/cities');
		expect(response.body).toBeArray();
		(response.body as string[]).forEach((city: string) => {
			expect(city).toBeString();
			expect(city).toContain(' (');
			expect(city).toContain(')');
		});
		expect(response.body[0]).toEqual('\'S GRAVENWEZEL (2970)');
	});

	it('organizations: should return list for organizations for cityName', async () => {
		const response = await api
			.get('/education-organizations/organizations')
			.query({
				city: 'Kachtem',
			});
		expect(response.body).toBeArray();
		(response.body as ClientEducationOrganization[]).forEach((org: ClientEducationOrganization) => {
			expect(org).toBeObject();
			expect(org).toContainAllKeys(['label', 'organizationId', 'unitId']);
		});
	});

	it('organizations: should return list for organizations for zipCode', async () => {
		const response = await api
			.get('/education-organizations/organizations')
			.query({
				zipCode: '8870',
			});
		expect(response.body).toBeArray();
		(response.body as ClientEducationOrganization[]).forEach((org: ClientEducationOrganization) => {
			expect(org).toBeObject();
			expect(org).toContainAllKeys(['label', 'organizationId', 'unitId']);
		});
	});

	it('organizations: should return list for organizations for cityName and zipCode', async () => {
		const response = await api
			.get('/education-organizations/organizations')
			.query({
				zipCode: '8870',
				city: 'Kachtem',
			});
		expect(response.body).toBeArray();
		(response.body as ClientEducationOrganization[]).forEach((org: ClientEducationOrganization) => {
			expect(org).toBeObject();
			expect(org).toContainAllKeys(['label', 'organizationId', 'unitId']);
		});
	});

	it('organizations: should throw an error if no city or zipCode is passed', async () => {
		const response = await api
			.get('/education-organizations/organizations');
		expect(response.body.message).toEqual('Failed to get organizations because neither the city nor the zipCode queryParams were provided');
	});
});
