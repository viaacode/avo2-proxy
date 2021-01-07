import { MediaPlayerPathInfo } from './types';

export const MEDIA_PLAYER_BLOCKS: { [blockType: string]: MediaPlayerPathInfo } = {
	MEDIA_PLAYER: {
		getItemExternalIdPath: 'variables.componentState.item.value',
		setItemExternalIdPath: 'variables.componentState.external_id',
		setVideoSrcPath: 'variables.componentState.src',
		setPosterSrcPath: 'variables.componentState.poster',
		setTitlePath: 'variables.componentState.title',
		setDescriptionPath: 'variables.componentState.description',
		setIssuedPath: 'variables.componentState.issued',
		setOrganisationPath: 'variables.componentState.organisation',
		setDurationPath: 'variables.componentState.duration',
	},
	MEDIA_PLAYER_TITLE_TEXT_BUTTON: {
		getItemExternalIdPath: 'variables.componentState.mediaItem.value',
		setItemExternalIdPath: 'variables.componentState.mediaExternalId',
		setVideoSrcPath: 'variables.componentState.mediaSrc',
		setPosterSrcPath: 'variables.componentState.mediaPoster',
		setTitlePath: 'variables.componentState.mediaTitle',
		setDescriptionPath: 'variables.componentState.mediaDescription',
		setIssuedPath: 'variables.componentState.mediaIssued',
		setOrganisationPath: 'variables.componentState.mediaOrganisation',
		setDurationPath: 'variables.componentState.mediaDuration',
	},
};

export const DEFAULT_AUDIO_STILL = '/images/audio-still.svg';
