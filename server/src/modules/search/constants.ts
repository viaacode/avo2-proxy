import _ from 'lodash';

import { Avo } from '@viaa/avo2-types';

// Max number of search results to return to the client
export const MAX_NUMBER_SEARCH_RESULTS = 2000;
// Max count to return to the client to avoid error:
// -  Result window is too large, from + size must be less than or equal to: [10000] but was [17110].
// -  See the scroll api for a more efficient way to request large data sets.
// -  This limit can be set by changing the [index.max_result_window] index level setting.
export const MAX_COUNT_SEARCH_RESULTS = 10000;
export const NUMBER_OF_FILTER_OPTIONS = 40;

export const READABLE_TO_ELASTIC_FILTER_NAMES: { [prop in Avo.Search.FilterProp]: string } = {
	query: 'query',
	type: 'administrative_type',
	educationLevel: 'lom_context',
	domain: 'lom_typical_age_range', // broken // TODO VIAA
	broadcastDate: 'dcterms_issued',
	language: 'lom_languages',
	keyword: 'lom_keywords',
	subject: 'lom_classification',
	serie: 'dc_titles_serie',
	provider: 'original_cp',
	collectionLabel: 'collection_labels',
} as any; // TODO remove cast	after update to typings 2.14.0

export const NEEDS_FILTER_SUFFIX: { [prop in Avo.Search.FilterProp]: boolean } = {
	query: false,
	type: true,
	educationLevel: true,
	domain: true,
	broadcastDate: true,
	language: false,
	keyword: true,
	subject: true,
	serie: true,
	provider: true,
	collectionLabel: true,
} as any; // TODO remove cast	after update to typings 2.14.0

export type AggProps =
	| 'type'
	| 'educationLevel'
	| 'domain'
	| 'language'
	| 'keyword'
	| 'subject'
	| 'serie'
	| 'provider'
	| 'collectionLabel';

export const AGGS_PROPERTIES: Avo.Search.FilterProp[] = [
	'type',
	'educationLevel',
	'domain',
	'language',
	'keyword',
	'subject',
	'serie',
	'provider',
	'collectionLabel' as any, // TODO remove cast	after update to typings 2.14.0
];

export const ELASTIC_TO_READABLE_FILTER_NAMES = _.invert(READABLE_TO_ELASTIC_FILTER_NAMES);
