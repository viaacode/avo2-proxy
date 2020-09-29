import 'jest';

import type { Avo } from '@viaa/avo2-types';

import { AGGS_PROPERTIES } from './constants';
import aggregations from './fixtures/aggregations.json';
import SearchService from './service';

describe('Search', () => {
	it('should simplify aggregation object correctly', async () => {
		const filterOptions: Avo.Search.FilterOptions = SearchService.simplifyAggregations(aggregations);
		expect(filterOptions).toBeObject();
		expect(filterOptions).toContainAllKeys([...AGGS_PROPERTIES]);
		AGGS_PROPERTIES.forEach((key) => {
			expect(filterOptions[key]).toBeArray();
			filterOptions[key].forEach((optionsObj) => {
				expect(optionsObj).toBeObject();
				expect(optionsObj).toContainAnyKeys(['option_name', 'option_count']);
				expect(optionsObj.option_name).toBeString();
				expect(optionsObj.option_count).toBeNumber();
			});
		});
	});
});
