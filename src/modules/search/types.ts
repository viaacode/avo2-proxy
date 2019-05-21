export interface IFilters {
	typeIds: number[];
	educationLevelIds: number[];
	domainIds: number[];
	broadcastDate: {
		from: string;  // ISO date string
		until: string; // ISO date string
		checkYearsOnly: boolean;
	};
	languageIds: number[];
	subjects: number[];
	series: number[];
	length: {
		max: number;
		min: number;
	};
	provider: number[];
}

export interface IFilterRequest { // Used on client to verify request structure
	filters: Partial<IFilters>;
	offset: number;
	limit: number;
}

export interface IFilterResponse {
	results: IFilterItem[];
	count: number;
}

export interface IFilterItem {
	name: string;
	thumbnailUrl: string;
	// ....
}
