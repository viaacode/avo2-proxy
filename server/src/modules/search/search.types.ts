export interface ElasticsearchResponse {
	took: number;
	timed_out: boolean;
	_shards: {
		total: number;
		successful: number;
		skipped: number;
		failed: number;
	};
	hits: {
		total: number;
		max_score: number;
		hits: any[];
	};
	aggregations: any;
}

export type Aggregations = {
	[prop: string]: AggregationMultiBucket | AggregationSingleBucket;
};

export type AggregationMultiBucket = {
	buckets: {
		[bucketName: string]: {
			from?: number;
			to?: number;
			doc_count: number;
		};
	};
};

export type Bucket = { key: string; doc_count: number };

export type AggregationSingleBucket = {
	doc_count_error_upper_bound: number;
	sum_other_doc_count: number;
	buckets: Bucket[];
};

export interface SimpleBucket {
	option_name: string;
	option_count: number;
}
