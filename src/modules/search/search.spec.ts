import 'jest';
import * as _ from 'lodash';
import * as aggregations from './fixtures/aggregations.json';
import SearchService  from './service';
import { IFilterOptions } from './types';

const keys: string[] = [
	'lom_keywords.filter',
	'fragment_duration_seconds',
	'dc_titles_serie.filter',
	'lom_classification.filter',
	'lom_typical_age_range.filter',
	'administrative_type.filter',
	'lom_languages',
	'lom_context.filter',
	'original_cp.filter',
];

test('should simplify aggregation object correctly', async () => {
	const filterOptions: IFilterOptions = SearchService.simplifyAggregations(aggregations);
	expect(filterOptions).toBeObject();
	expect(filterOptions).toContainAllKeys([...keys, 'default']); // Side affect of import json module
	keys.forEach((key) => {
		expect(filterOptions[key]).toBeArray();
		filterOptions[key].forEach((optionsObj) => {
			expect(optionsObj).toBeObject();
			expect(optionsObj).toContainAnyKeys(['option_name', 'opton_count']);
			expect(optionsObj.option_name).toBeString();
			expect(optionsObj.option_count).toBeNumber();
		});
	});
});
