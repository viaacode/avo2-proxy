import type { Avo } from '@viaa/avo2-types';

export interface MediaPlayerPathInfo {
	getItemExternalIdPath: string;
	setItemExternalIdPath: string;
	setVideoSrcPath: string;
	setPosterSrcPath: string;
	setTitlePath: string;
	setDescriptionPath: string;
	setIssuedPath: string;
	setOrganisationPath: string;
	setDurationPath: string;
}

export type ResolvedItemOrCollection = Partial<Avo.Item.Item | Avo.Collection.Collection> & {
	src?: string;
};

export interface ContentPageOverviewParams {
	withBlock: boolean;
	contentType: string;
	// Visible tabs in the page overview component for which we should fetch item counts
	labelIds: number[];
	// Selected tabs for which we should fetch content page items
	selectedLabelIds: number[];
	orderByProp?: string;
	orderByDirection?: 'asc' | 'desc';
	offset: number;
	limit: number;
}

export interface ContentPageOverviewResponse {
	pages: Avo.ContentPage.Page[];
	count: number;
	labelCounts: { [id: number]: number };
}

export type LabelObj = {
	label: string;
	id: number;
};

export type ContentLabelsRequestBody =
	| {
			contentType: string;
			labelIds: string[];
	  }
	| {
			contentType: string;
			labels: string[];
	  };
