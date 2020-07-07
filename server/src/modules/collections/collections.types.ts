import { Avo } from '@viaa/avo2-types';

export interface MediaPlayerPathInfo {
	getItemExternalIdPath: string;
	setVideoSrcPath: string;
	setPosterSrcPath: string;
	setTitlePath: string;
	setDescriptionPath: string;
	setIssuedPath: string;
	setOrganisationPath: string;
}

export type ResolvedItemOrCollection = Partial<Avo.Item.Item | Avo.Collection.Collection> & {
	src?: string;
};

export interface ContentPageOverviewParams {
	withBlock: boolean;
	contentType: string;
	labelIds: number[];
	offset: number;
	limit: number;
}

export enum ContentTypeNumber {
	audio = 1,
	video = 2,
	collection = 3,
	bundle = 4,
}
