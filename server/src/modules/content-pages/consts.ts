import { MediaPlayerPathInfo } from './types';

export const MEDIA_PLAYER_BLOCKS: { [blockType: string]: MediaPlayerPathInfo } = {
	MEDIA_PLAYER: {
		getItemExternalIdPath: 'variables.componentState.item.value',
		setVideoSrcPath: 'variables.componentState.src',
		setPosterSrcPath: 'variables.componentState.poster',
		setTitlePath: 'variables.componentState.title',
		setDescriptionPath: 'variables.componentState.description',
		setIssuedPath: 'variables.componentState.issued',
		setOrganisationPath: 'variables.componentState.organisation',
	},
	MEDIA_PLAYER_TITLE_TEXT_BUTTON: {
		getItemExternalIdPath: 'variables.componentState.mediaItem.value',
		setVideoSrcPath: 'variables.componentState.mediaSrc',
		setPosterSrcPath: 'variables.componentState.mediaPoster',
		setTitlePath: 'variables.componentState.mediaTitle',
		setDescriptionPath: 'variables.componentState.mediaDescription',
		setIssuedPath: 'variables.componentState.mediaIssued',
		setOrganisationPath: 'variables.componentState.mediaOrganisation',
	},
};
