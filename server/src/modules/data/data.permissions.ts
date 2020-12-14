import { every, get, some } from 'lodash';

import { Avo } from '@viaa/avo2-types';

import { BadRequestError } from '../../shared/helpers/error';
import { PermissionName } from '../../shared/permissions';
import AssetController from '../assets/assets.controller';
import { AuthService } from '../auth/service';
import CollectionsService from '../collections/collections.service';
import { ContentTypeNumber } from '../collections/collections.types';
import ContentPageService from '../content-pages/service';

import DataService from './data.service';

type IsAllowed = (user: Avo.User.User, query: string, variables: any) => Promise<boolean>;

function or(...permissionNames: PermissionName[]): IsAllowed {
	return async (user: Avo.User.User, query: string, variables: any): Promise<boolean> => {
		return some(permissionNames, (permissionName) =>
			AuthService.hasPermission(user, permissionName)
		);
	};
}

function and(...permissionNames: PermissionName[]): IsAllowed {
	return async (user: Avo.User.User, query: string, variables: any): Promise<boolean> => {
		return every(permissionNames, (permissionName) =>
			AuthService.hasPermission(user, permissionName)
		);
	};
}

function ifProfileIdMatches(propName: string): IsAllowed {
	return async (user: Avo.User.User, query: string, variables: any): Promise<boolean> => {
		return user.profile.id === variables[propName];
	};
}

function deleteCollectionOrBundle(propName: string): IsAllowed {
	return async (user: Avo.User.User, query: string, variables: any): Promise<boolean> => {
		if (
			AuthService.hasPermission(user, PermissionName.DELETE_OWN_COLLECTIONS) ||
			AuthService.hasPermission(user, PermissionName.DELETE_OWN_BUNDLES)
		) {
			const collection = await CollectionsService.fetchCollectionOrBundleById(
				variables[propName]
			);
			if (!collection) {
				return true;
			}
			if (collection.owner_profile_id === user.profile.id) {
				return true;
			}
		}
		if (
			AuthService.hasPermission(user, PermissionName.DELETE_ANY_COLLECTIONS) ||
			AuthService.hasPermission(user, PermissionName.DELETE_ANY_BUNDLES)
		) {
			return true;
		}

		return false;
	};
}

async function insertOrUpdateContentBlocks(
	user: Avo.User.User,
	query: string,
	variables: any
): Promise<boolean> {
	if (AuthService.hasPermission(user, PermissionName.EDIT_ANY_CONTENT_PAGES)) {
		return true;
	}

	const contentPageIds: number[] = variables.contentBlocks.map(
		(block: Avo.ContentPage.Block) => block.content_id
	);
	const contentPages: Avo.ContentPage.Page[] = await ContentPageService.getContentPagesByIds(
		contentPageIds
	);

	if (
		(AuthService.hasPermission(user, PermissionName.CREATE_CONTENT_PAGES) ||
			AuthService.hasPermission(user, PermissionName.EDIT_OWN_CONTENT_PAGES)) &&
		every(contentPages, (contentPage) => contentPage.user_profile_id === user.profile.id)
	) {
		return true;
	}

	return false;
}

function hasFilter(variables: any, path: string, value: any): boolean {
	const filters = get(variables, 'where._and') || [];
	return !!filters.find((filter: any) => {
		return get(filter, path) === value;
	});
}

const ALL_LOGGED_IN_USERS = () => Promise.resolve(true);

export const QUERY_PERMISSIONS: {
	CLIENT: { [queryName: string]: IsAllowed };
	PROXY: { [queryName: string]: IsAllowed };
} = {
	CLIENT: {
		GET_COLLECTIONS: async (user: Avo.User.User, query: string, variables: any) => {
			if (
				AuthService.hasPermission(user, PermissionName.VIEW_ANY_PUBLISHED_COLLECTIONS) &&
				AuthService.hasPermission(user, PermissionName.VIEW_ANY_UNPUBLISHED_COLLECTIONS) &&
				hasFilter(variables, 'type_id._eq', ContentTypeNumber.collection)
			) {
				return true;
			}

			if (
				AuthService.hasPermission(user, PermissionName.VIEW_ANY_PUBLISHED_BUNDLES) &&
				AuthService.hasPermission(user, PermissionName.VIEW_ANY_UNPUBLISHED_BUNDLES) &&
				hasFilter(variables, 'type_id._eq', ContentTypeNumber.bundle)
			) {
				return true;
			}

			if (
				AuthService.hasPermission(user, PermissionName.VIEW_ANY_PUBLISHED_COLLECTIONS) &&
				hasFilter(variables, 'is_public._eq', true) &&
				hasFilter(variables, 'type_id._eq', ContentTypeNumber.collection)
			) {
				return true;
			}

			if (
				AuthService.hasPermission(user, PermissionName.VIEW_ANY_UNPUBLISHED_COLLECTIONS) &&
				hasFilter(variables, 'is_public._eq', false) &&
				hasFilter(variables, 'type_id._eq', ContentTypeNumber.collection)
			) {
				return true;
			}

			if (
				AuthService.hasPermission(user, PermissionName.VIEW_ANY_PUBLISHED_BUNDLES) &&
				hasFilter(variables, 'is_public._eq', true) &&
				hasFilter(variables, 'type_id._eq', ContentTypeNumber.bundle)
			) {
				return true;
			}

			if (
				AuthService.hasPermission(user, PermissionName.VIEW_ANY_UNPUBLISHED_BUNDLES) &&
				hasFilter(variables, 'is_public._eq', false) &&
				hasFilter(variables, 'type_id._eq', ContentTypeNumber.bundle)
			) {
				return true;
			}

			return false;
		},
		GET_COLLECTION_IDS: or(
			PermissionName.VIEW_COLLECTIONS_OVERVIEW,
			PermissionName.VIEW_BUNDLES_OVERVIEW
		),
		BULK_UPDATE_PUBLISH_STATE_FOR_COLLECTIONS: or(
			PermissionName.PUBLISH_ALL_COLLECTIONS,
			PermissionName.PUBLISH_ALL_BUNDLES
		),
		BULK_UPDATE_AUTHOR_FOR_COLLECTIONS: or(
			PermissionName.EDIT_ANY_COLLECTIONS,
			PermissionName.EDIT_ANY_BUNDLES
		),
		BULK_DELETE_COLLECTIONS: or(
			PermissionName.DELETE_ANY_COLLECTIONS,
			PermissionName.DELETE_ANY_BUNDLES
		),
		BULK_ADD_LABELS_TO_COLLECTIONS: or(
			PermissionName.EDIT_ANY_COLLECTIONS,
			PermissionName.EDIT_ANY_BUNDLES
		),
		BULK_DELETE_LABELS_FROM_COLLECTIONS: or(
			PermissionName.EDIT_ANY_COLLECTIONS,
			PermissionName.EDIT_ANY_BUNDLES
		),
		BULK_UPDATE_DATE_AND_LAST_AUTHOR_COLLECTIONS: or(
			PermissionName.EDIT_ANY_COLLECTIONS,
			PermissionName.EDIT_ANY_BUNDLES
		),
		INSERT_CONTENT_BLOCKS: insertOrUpdateContentBlocks,
		UPDATE_CONTENT_BLOCK: insertOrUpdateContentBlocks,
		DELETE_CONTENT_BLOCK: or(PermissionName.DELETE_ANY_CONTENT_PAGES),
		GET_CONTENT_PAGE_LABELS: or(PermissionName.EDIT_CONTENT_PAGE_LABELS),
		DELETE_CONTENT_PAGE_LABEL: or(PermissionName.EDIT_CONTENT_PAGE_LABELS),
		GET_CONTENT_PAGE_LABEL_BY_ID: ALL_LOGGED_IN_USERS,
		INSERT_CONTENT_PAGE_LABEL: or(PermissionName.EDIT_CONTENT_PAGE_LABELS),
		UPDATE_CONTENT_PAGE_LABEL: or(PermissionName.EDIT_CONTENT_PAGE_LABELS),
		GET_CONTENT_PAGES: or(PermissionName.VIEW_ADMIN_DASHBOARD),
		GET_PUBLIC_PROJECT_CONTENT_PAGES: or(
			PermissionName.EDIT_CONTENT_PAGE_LABELS,
			PermissionName.EDIT_OWN_CONTENT_PAGES,
			PermissionName.EDIT_ANY_CONTENT_PAGES
		),
		GET_PUBLIC_CONTENT_PAGES_BY_TITLE: or(
			PermissionName.EDIT_CONTENT_PAGE_LABELS,
			PermissionName.EDIT_OWN_CONTENT_PAGES,
			PermissionName.EDIT_ANY_CONTENT_PAGES,
			PermissionName.EDIT_INTERACTIVE_TOURS,
			PermissionName.EDIT_NAVIGATION_BARS
		),
		GET_PUBLIC_PROJECT_CONTENT_PAGES_BY_TITLE: or(
			PermissionName.EDIT_CONTENT_PAGE_LABELS,
			PermissionName.EDIT_OWN_CONTENT_PAGES,
			PermissionName.EDIT_ANY_CONTENT_PAGES,
			PermissionName.EDIT_INTERACTIVE_TOURS,
			PermissionName.EDIT_NAVIGATION_BARS
		),
		GET_CONTENT_BY_ID: or(
			PermissionName.EDIT_ANY_CONTENT_PAGES,
			PermissionName.EDIT_OWN_CONTENT_PAGES
		),
		GET_CONTENT_TYPES: or(
			PermissionName.EDIT_ANY_CONTENT_PAGES,
			PermissionName.EDIT_OWN_CONTENT_PAGES
		),
		UPDATE_CONTENT_BY_ID: async (user: Avo.User.User, query: string, variables: any) => {
			if (AuthService.hasPermission(user, PermissionName.EDIT_ANY_CONTENT_PAGES)) {
				return true;
			}
			if (AuthService.hasPermission(user, PermissionName.EDIT_OWN_CONTENT_PAGES)) {
				const contentPage = (
					await ContentPageService.getContentPagesByIds([variables.id])
				)[0];
				if (!contentPage) {
					return true;
				}
				if (
					contentPage.user_profile_id === user.profile.id &&
					variables.contentPage.user_profile_id === user.profile.id
				) {
					return true;
				}
			}
			return false;
		},
		INSERT_CONTENT: async (user: Avo.User.User, query: string, variables: any) => {
			if (AuthService.hasPermission(user, PermissionName.EDIT_ANY_CONTENT_PAGES)) {
				return true;
			}
			if (
				AuthService.hasPermission(user, PermissionName.EDIT_OWN_CONTENT_PAGES) &&
				variables.contentPage.user_profile_id === user.profile.id
			) {
				return true;
			}
			return false;
		},
		SOFT_DELETE_CONTENT: or(PermissionName.DELETE_ANY_CONTENT_PAGES),
		GET_PERMISSIONS_FROM_CONTENT_PAGE_BY_PATH: or(PermissionName.EDIT_NAVIGATION_BARS),
		GET_CONTENT_LABELS_BY_CONTENT_TYPE: or(
			PermissionName.EDIT_ANY_CONTENT_PAGES,
			PermissionName.EDIT_OWN_CONTENT_PAGES
		),
		INSERT_CONTENT_LABEL_LINKS: async (user: Avo.User.User, query: string, variables: any) => {
			if (AuthService.hasPermission(user, PermissionName.EDIT_ANY_CONTENT_PAGES)) {
				return true;
			}
			if (AuthService.hasPermission(user, PermissionName.EDIT_OWN_CONTENT_PAGES)) {
				const contentPages = await ContentPageService.getContentPagesByIds(
					variables.objects.map((obj: any) => obj.content_id)
				);
				if (
					every(
						contentPages,
						(contentPage) => contentPage.user_profile_id === user.profile.id
					)
				) {
					return true;
				}
			}

			return false;
		},
		DELETE_CONTENT_LABEL_LINKS: async (user: Avo.User.User, query: string, variables: any) => {
			if (AuthService.hasPermission(user, PermissionName.EDIT_ANY_CONTENT_PAGES)) {
				return true;
			}
			if (AuthService.hasPermission(user, PermissionName.EDIT_OWN_CONTENT_PAGES)) {
				const contentPage = (
					await ContentPageService.getContentPagesByIds([variables.contentPageId])
				)[0];
				if (contentPage.user_profile_id === user.profile.id) {
					return true;
				}
			}

			return false;
		},
		GET_INTERACTIVE_TOUR_BY_ID: ALL_LOGGED_IN_USERS,
		GET_INTERACTIVE_TOURS: or(PermissionName.EDIT_INTERACTIVE_TOURS),
		INSERT_INTERACTIVE_TOUR: or(PermissionName.EDIT_INTERACTIVE_TOURS),
		UPDATE_INTERACTIVE_TOUR: or(PermissionName.EDIT_INTERACTIVE_TOURS),
		DELETE_INTERACTIVE_TOUR: or(PermissionName.EDIT_INTERACTIVE_TOURS),
		GET_ITEMS_WITH_FILTERS: or(PermissionName.VIEW_ITEMS_OVERVIEW),
		GET_UNPUBLISHED_ITEMS_WITH_FILTERS: and(
			PermissionName.VIEW_ITEMS_OVERVIEW,
			PermissionName.VIEW_ANY_UNPUBLISHED_ITEMS
		),
		GET_ITEM_BY_UUID: ALL_LOGGED_IN_USERS,
		UPDATE_ITEM_PUBLISH_STATE: or(PermissionName.PUBLISH_ITEMS),
		UPDATE_ITEM_DEPUBLISH_REASON: or(PermissionName.PUBLISH_ITEMS),
		UPDATE_ITEM_NOTES: or(PermissionName.VIEW_ITEMS_OVERVIEW),
		GET_PUBLIC_ITEMS: or(
			PermissionName.VIEW_ANY_PUBLISHED_ITEMS,
			PermissionName.EDIT_CONTENT_PAGE_LABELS,
			PermissionName.PUBLISH_ITEMS
		),
		FETCH_ITEM_UUID_BY_EXTERNAL_ID: ALL_LOGGED_IN_USERS,
		GET_PUBLIC_ITEMS_BY_TITLE_OR_EXTERNAL_ID: or(
			PermissionName.VIEW_ANY_PUBLISHED_ITEMS,
			PermissionName.EDIT_CONTENT_PAGE_LABELS,
			PermissionName.PUBLISH_ITEMS
		),
		GET_ITEM_BY_EXTERNAL_ID: ALL_LOGGED_IN_USERS,
		GET_ITEM_DEPUBLISH_REASON: ALL_LOGGED_IN_USERS,
		GET_DISTINCT_SERIES: or(PermissionName.VIEW_ITEMS_OVERVIEW),
		DELETE_ITEM_FROM_COLLECTIONS_BOOKMARKS: or(PermissionName.PUBLISH_ITEMS),
		REPLACE_ITEM_IN_COLLECTIONS_BOOKMARKS_AND_ASSIGNMENTS: or(PermissionName.PUBLISH_ITEMS),
		UPDATE_SHARED_ITEMS_STATUS: or(PermissionName.PUBLISH_ITEMS),
		GET_MENUS: or(PermissionName.EDIT_NAVIGATION_BARS),
		GET_MENU_ITEMS_BY_PLACEMENT: or(PermissionName.EDIT_NAVIGATION_BARS),
		GET_MENU_ITEM_BY_ID: or(PermissionName.EDIT_NAVIGATION_BARS),
		UPDATE_MENU_ITEM_BY_ID: or(PermissionName.EDIT_NAVIGATION_BARS),
		INSERT_MENU_ITEM: or(PermissionName.EDIT_NAVIGATION_BARS),
		DELETE_MENU_ITEM: or(PermissionName.EDIT_NAVIGATION_BARS),
		GET_PERMISSION_GROUPS: or(PermissionName.EDIT_PERMISSION_GROUPS),
		DELETE_PERMISSION_GROUP: or(PermissionName.EDIT_PERMISSION_GROUPS),
		GET_PERMISSION_GROUP_BY_ID: or(PermissionName.EDIT_PERMISSION_GROUPS),
		GET_ALL_PERMISSIONS: or(PermissionName.EDIT_PERMISSION_GROUPS),
		ADD_PERMISSIONS_TO_GROUP: or(PermissionName.EDIT_PERMISSION_GROUPS),
		REMOVE_PERMISSIONS_FROM_GROUP: or(PermissionName.EDIT_PERMISSION_GROUPS),
		INSERT_PERMISSIONS_GROUP: or(PermissionName.EDIT_PERMISSION_GROUPS),
		UPDATE_PERMISSIONS_GROUP: or(PermissionName.EDIT_PERMISSION_GROUPS),
		GET_TRANSLATIONS: or(PermissionName.EDIT_TRANSLATIONS),
		UPDATE_TRANSLATIONS: or(PermissionName.EDIT_TRANSLATIONS),
		GET_USER_GROUP_BY_ID: or(PermissionName.EDIT_USER_GROUPS),
		GET_USER_GROUPS_WITH_FILTERS: or(PermissionName.EDIT_USER_GROUPS),
		GET_ALL_PERMISSION_GROUPS: or(PermissionName.EDIT_USER_GROUPS),
		ADD_PERMISSION_GROUPS_TO_USER_GROUP: or(PermissionName.EDIT_USER_GROUPS),
		REMOVE_PERMISSION_GROUPS_FROM_USER_GROUP: or(PermissionName.EDIT_USER_GROUPS),
		INSERT_USER_GROUP: or(PermissionName.EDIT_USER_GROUPS),
		UPDATE_USER_GROUP: or(PermissionName.EDIT_USER_GROUPS),
		DELETE_USER_GROUP: or(PermissionName.EDIT_USER_GROUPS),
		GET_USER_BY_ID: or(PermissionName.EDIT_ANY_USER),
		GET_USERS: or(PermissionName.EDIT_ANY_USER),
		GET_PROFILE_IDS: or(PermissionName.EDIT_ANY_USER),
		GET_PROFILE_NAMES: or(
			PermissionName.EDIT_ANY_USER,
			PermissionName.VIEW_COLLECTIONS_OVERVIEW,
			PermissionName.VIEW_BUNDLES_OVERVIEW,
			PermissionName.EDIT_OWN_CONTENT_PAGES,
			PermissionName.EDIT_ANY_CONTENT_PAGES
		),
		BULK_ADD_SUBJECTS_TO_PROFILES: or(PermissionName.EDIT_ANY_USER),
		BULK_DELETE_SUBJECTS_FROM_PROFILES: or(PermissionName.EDIT_ANY_USER),
		GET_DISTINCT_BUSINESS_CATEGORIES: or(PermissionName.EDIT_ANY_USER),
		GET_IDPS: or(PermissionName.VIEW_USERS),
		GET_CONTENT_COUNTS_FOR_USERS: or(PermissionName.EDIT_ANY_USER),
		GET_ASSIGNMENT_BY_ID: or(PermissionName.EDIT_ASSIGNMENTS),
		GET_ASSIGNMENT_BY_CONTENT_ID_AND_TYPE: or(
			PermissionName.EDIT_ASSIGNMENTS,
			PermissionName.EDIT_ANY_COLLECTIONS,
			PermissionName.EDIT_ANY_BUNDLES,
			PermissionName.DELETE_ANY_COLLECTIONS,
			PermissionName.DELETE_OWN_COLLECTIONS,
			PermissionName.DELETE_ANY_BUNDLES,
			PermissionName.DELETE_OWN_BUNDLES
		),
		GET_ASSIGNMENTS_BY_OWNER_ID: or(PermissionName.EDIT_ASSIGNMENTS),
		GET_ASSIGNMENTS_BY_RESPONSE_OWNER_ID: or(PermissionName.CREATE_ASSIGNMENT_RESPONSE),
		GET_ASSIGNMENT_RESPONSES: or(
			PermissionName.EDIT_ASSIGNMENTS,
			PermissionName.CREATE_ASSIGNMENT_RESPONSE
		),
		GET_ASSIGNMENT_WITH_RESPONSE: or(PermissionName.VIEW_ASSIGNMENTS),
		INSERT_ASSIGNMENT: async (user: Avo.User.User, query: string, variables: any) => {
			return (
				AuthService.hasPermission(user, PermissionName.EDIT_ASSIGNMENTS) &&
				variables.assignment.owner_profile_id === user.profile.id
			);
		},
		UPDATE_ASSIGNMENT: async (user: Avo.User.User, query: string, variables: any) => {
			const assignmentOwner = await DataService.getAssignmentOwner(variables.id);
			return (
				AuthService.hasPermission(user, PermissionName.EDIT_ASSIGNMENTS) &&
				assignmentOwner === user.profile.id
			);
		},
		UPDATE_ASSIGNMENT_ARCHIVE_STATUS: or(PermissionName.EDIT_ASSIGNMENTS),
		UPDATE_ASSIGNMENT_RESPONSE_SUBMITTED_STATUS: or(PermissionName.CREATE_ASSIGNMENT_RESPONSE),
		DELETE_ASSIGNMENT: async (user: Avo.User.User, query: string, variables: any) => {
			const assignmentOwner = await DataService.getAssignmentOwner(variables.id);
			return (
				AuthService.hasPermission(user, PermissionName.EDIT_ASSIGNMENTS) &&
				assignmentOwner === user.profile.id
			);
		},
		INSERT_ASSIGNMENT_RESPONSE: or(PermissionName.CREATE_ASSIGNMENT_RESPONSE),
		GET_COLLECTION_BY_ID: or(
			PermissionName.CREATE_BUNDLES,
			PermissionName.EDIT_ANY_COLLECTIONS,
			PermissionName.EDIT_OWN_COLLECTIONS,
			PermissionName.EDIT_ANY_BUNDLES,
			PermissionName.EDIT_OWN_BUNDLES,
			PermissionName.ADD_ITEM_TO_COLLECTION_BY_PID
		),
		UPDATE_COLLECTION: async (user: Avo.User.User, query: string, variables: any) => {
			if (
				AuthService.hasPermission(user, PermissionName.EDIT_ANY_COLLECTIONS) ||
				AuthService.hasPermission(user, PermissionName.EDIT_ANY_BUNDLES)
			) {
				return true;
			}
			if (
				AuthService.hasPermission(user, PermissionName.EDIT_OWN_COLLECTIONS) ||
				AuthService.hasPermission(user, PermissionName.EDIT_OWN_BUNDLES)
			) {
				const collectionOwner = await DataService.getCollectionOwner(variables.id);
				return collectionOwner === user.profile.id;
			}
			return false;
		},
		INSERT_COLLECTION: async (user: Avo.User.User, query: string, variables: any) => {
			if (
				AuthService.hasPermission(user, PermissionName.EDIT_ANY_COLLECTIONS) ||
				AuthService.hasPermission(user, PermissionName.EDIT_ANY_BUNDLES)
			) {
				return true;
			}
			if (
				AuthService.hasPermission(user, PermissionName.EDIT_OWN_COLLECTIONS) ||
				AuthService.hasPermission(user, PermissionName.EDIT_OWN_BUNDLES)
			) {
				return variables.collection.owner_profile_id === user.profile.id;
			}
			return false;
		},
		SOFT_DELETE_COLLECTION: deleteCollectionOrBundle('id'),
		UPDATE_COLLECTION_FRAGMENT: or(
			PermissionName.EDIT_OWN_COLLECTIONS,
			PermissionName.EDIT_ANY_COLLECTIONS,
			PermissionName.EDIT_OWN_BUNDLES,
			PermissionName.EDIT_ANY_BUNDLES
		),
		DELETE_COLLECTION_FRAGMENT: or(
			PermissionName.EDIT_OWN_COLLECTIONS,
			PermissionName.EDIT_ANY_COLLECTIONS,
			PermissionName.EDIT_OWN_BUNDLES,
			PermissionName.EDIT_ANY_BUNDLES
		),
		INSERT_COLLECTION_FRAGMENTS: or(
			PermissionName.EDIT_OWN_COLLECTIONS,
			PermissionName.EDIT_ANY_COLLECTIONS,
			PermissionName.EDIT_OWN_BUNDLES,
			PermissionName.EDIT_ANY_BUNDLES
		),
		GET_COLLECTIONS_BY_OWNER: ifProfileIdMatches('owner_profile_id'),
		GET_PUBLIC_COLLECTIONS: or(PermissionName.VIEW_ANY_PUBLISHED_COLLECTIONS),
		GET_PUBLIC_COLLECTIONS_BY_ID: or(PermissionName.EDIT_CONTENT_PAGE_LABELS),
		GET_PUBLIC_COLLECTIONS_BY_TITLE: or(PermissionName.EDIT_CONTENT_PAGE_LABELS),
		GET_COLLECTION_TITLES_BY_OWNER: async (
			user: Avo.User.User,
			query: string,
			variables: any
		) => {
			return (
				AuthService.hasPermission(user, PermissionName.CREATE_COLLECTIONS) &&
				variables.owner_profile_id === user.profile.id
			);
		},
		GET_BUNDLE_TITLES_BY_OWNER: async (user: Avo.User.User, query: string, variables: any) => {
			return (
				AuthService.hasPermission(user, PermissionName.CREATE_BUNDLES) &&
				variables.owner_profile_id === user.profile.id
			);
		},
		GET_BUNDLES_CONTAINING_COLLECTION: or(
			PermissionName.VIEW_OWN_COLLECTIONS,
			PermissionName.VIEW_ANY_PUBLISHED_COLLECTIONS,
			PermissionName.VIEW_ANY_UNPUBLISHED_COLLECTIONS
		),
		INSERT_COLLECTION_LABELS: or(
			PermissionName.EDIT_COLLECTION_LABELS,
			PermissionName.EDIT_BUNDLE_LABELS
		),
		DELETE_COLLECTION_LABELS: or(
			PermissionName.EDIT_COLLECTION_LABELS,
			PermissionName.EDIT_BUNDLE_LABELS
		),
		GET_QUALITY_LABELS: or(
			PermissionName.VIEW_ANY_PUBLISHED_ITEMS,
			PermissionName.EDIT_COLLECTION_LABELS,
			PermissionName.EDIT_BUNDLE_LABELS
		),
		GET_COLLECTION_BY_TITLE_OR_DESCRIPTION: or(
			PermissionName.PUBLISH_OWN_COLLECTIONS,
			PermissionName.PUBLISH_ALL_COLLECTIONS,
			PermissionName.PUBLISH_OWN_BUNDLES,
			PermissionName.PUBLISH_ALL_BUNDLES
		),
		GET_COLLECTIONS_BY_FRAGMENT_ID: or(
			PermissionName.VIEW_ANY_PUBLISHED_ITEMS,
			PermissionName.VIEW_ANY_UNPUBLISHED_ITEMS,
			PermissionName.EDIT_ANY_COLLECTIONS,
			PermissionName.EDIT_OWN_COLLECTIONS,
			PermissionName.EDIT_ANY_BUNDLES,
			PermissionName.EDIT_OWN_BUNDLES
		),
		INSERT_COLLECTION_RELATION: or(PermissionName.CREATE_COLLECTIONS),
		GET_EDUCATION_LEVELS: ALL_LOGGED_IN_USERS,
		GET_SUBJECTS: ALL_LOGGED_IN_USERS,
		GET_ASSIGNMENT_LABELS_BY_PROFILE_ID: or(
			PermissionName.EDIT_ASSIGNMENTS,
			PermissionName.CREATE_ASSIGNMENT_RESPONSE
		),
		INSERT_ASSIGNMENT_LABELS: or(PermissionName.EDIT_ASSIGNMENTS),
		UPDATE_ASSIGNMENT_LABEL: or(PermissionName.EDIT_ASSIGNMENTS),
		DELETE_ASSIGNMENT_LABELS: or(PermissionName.EDIT_ASSIGNMENTS),
		LINK_ASSIGNMENT_LABELS_FROM_ASSIGNMENT: or(PermissionName.EDIT_ASSIGNMENTS),
		UNLINK_ASSIGNMENT_LABELS_FROM_ASSIGNMENT: or(PermissionName.EDIT_ASSIGNMENTS),
		GET_ALL_ASSIGNMENT_LABEL_COLORS: or(PermissionName.EDIT_ASSIGNMENTS),
		INSERT_ITEM_BOOKMARK: or(PermissionName.CREATE_BOOKMARKS),
		INSERT_COLLECTION_BOOKMARK: or(PermissionName.CREATE_BOOKMARKS),
		REMOVE_ITEM_BOOKMARK: or(PermissionName.CREATE_BOOKMARKS),
		REMOVE_COLLECTION_BOOKMARK: or(PermissionName.CREATE_BOOKMARKS),
		INCREMENT_ITEM_VIEWS: or(PermissionName.VIEW_ANY_PUBLISHED_ITEMS),
		INCREMENT_COLLECTION_VIEWS: or(
			PermissionName.VIEW_OWN_COLLECTIONS,
			PermissionName.VIEW_ANY_PUBLISHED_COLLECTIONS,
			PermissionName.VIEW_ANY_UNPUBLISHED_COLLECTIONS
		),
		INIT_ITEM_VIEWS: or(
			PermissionName.VIEW_ANY_PUBLISHED_ITEMS,
			PermissionName.CREATE_ASSIGNMENT_RESPONSE
		),
		INIT_COLLECTION_VIEWS: or(
			PermissionName.VIEW_OWN_COLLECTIONS,
			PermissionName.VIEW_ANY_PUBLISHED_COLLECTIONS,
			PermissionName.VIEW_ANY_UNPUBLISHED_COLLECTIONS,
			PermissionName.CREATE_ASSIGNMENT_RESPONSE
		),
		INCREMENT_ITEM_PLAYS: or(
			PermissionName.VIEW_ANY_PUBLISHED_ITEMS,
			PermissionName.CREATE_ASSIGNMENT_RESPONSE
		),
		INCREMENT_COLLECTION_PLAYS: or(
			PermissionName.VIEW_OWN_COLLECTIONS,
			PermissionName.VIEW_ANY_PUBLISHED_COLLECTIONS,
			PermissionName.VIEW_ANY_UNPUBLISHED_COLLECTIONS,
			PermissionName.CREATE_ASSIGNMENT_RESPONSE
		),
		GET_ITEM_VIEWS: or(
			PermissionName.VIEW_ANY_PUBLISHED_ITEMS,
			PermissionName.CREATE_ASSIGNMENT_RESPONSE
		),
		GET_COLLECTION_VIEWS: or(
			PermissionName.VIEW_OWN_COLLECTIONS,
			PermissionName.VIEW_ANY_PUBLISHED_COLLECTIONS,
			PermissionName.VIEW_ANY_UNPUBLISHED_COLLECTIONS,
			PermissionName.CREATE_ASSIGNMENT_RESPONSE
		),
		GET_ITEM_PLAYS: or(
			PermissionName.VIEW_ANY_PUBLISHED_ITEMS,
			PermissionName.CREATE_ASSIGNMENT_RESPONSE
		),
		GET_COLLECTION_PLAYS: or(
			PermissionName.VIEW_OWN_COLLECTIONS,
			PermissionName.VIEW_ANY_PUBLISHED_COLLECTIONS,
			PermissionName.VIEW_ANY_UNPUBLISHED_COLLECTIONS,
			PermissionName.CREATE_ASSIGNMENT_RESPONSE
		),
		INIT_ITEM_PLAYS: or(
			PermissionName.VIEW_ANY_PUBLISHED_ITEMS,
			PermissionName.CREATE_ASSIGNMENT_RESPONSE
		),
		INIT_COLLECTION_PLAYS: or(
			PermissionName.VIEW_OWN_COLLECTIONS,
			PermissionName.VIEW_ANY_PUBLISHED_COLLECTIONS,
			PermissionName.VIEW_ANY_UNPUBLISHED_COLLECTIONS,
			PermissionName.CREATE_ASSIGNMENT_RESPONSE
		),
		GET_ITEM_BOOKMARK_VIEW_PLAY_COUNTS: or(PermissionName.VIEW_ANY_PUBLISHED_ITEMS),
		GET_COLLECTION_BOOKMARK_VIEW_PLAY_COUNTS: or(
			PermissionName.VIEW_ANY_PUBLISHED_COLLECTIONS,
			PermissionName.VIEW_ANY_UNPUBLISHED_COLLECTIONS,
			PermissionName.VIEW_ANY_PUBLISHED_BUNDLES,
			PermissionName.VIEW_ANY_UNPUBLISHED_BUNDLES,
			PermissionName.EDIT_OWN_COLLECTIONS,
			PermissionName.EDIT_ANY_COLLECTIONS,
			PermissionName.EDIT_OWN_BUNDLES,
			PermissionName.EDIT_ANY_BUNDLES
		),
		GET_MULTIPLE_ITEM_VIEW_COUNTS: or(
			PermissionName.VIEW_ANY_PUBLISHED_BUNDLES,
			PermissionName.VIEW_ANY_UNPUBLISHED_BUNDLES
		),
		GET_MULTIPLE_COLLECTION_VIEW_COUNTS: or(
			PermissionName.VIEW_ANY_PUBLISHED_BUNDLES,
			PermissionName.VIEW_ANY_UNPUBLISHED_BUNDLES
		),
		GET_BOOKMARKS_FOR_USER: or(PermissionName.CREATE_BOOKMARKS),
		GET_BOOKMARK_STATUSES: or(PermissionName.CREATE_BOOKMARKS),
		GET_NOTIFICATION: ALL_LOGGED_IN_USERS,
		INSERT_NOTIFICATION: ifProfileIdMatches('profileId'),
		UPDATE_NOTIFICATION: ifProfileIdMatches('profileId'),
		GET_ALL_ORGANISATIONS: ALL_LOGGED_IN_USERS,
		GET_DISTINCT_ORGANISATIONS: ALL_LOGGED_IN_USERS,
		GET_USERS_IN_COMPANY: or(PermissionName.VIEW_USERS_IN_SAME_COMPANY),
		FETCH_COLLECTION_RELATIONS_BY_OBJECTS: or(),
		FETCH_ITEM_RELATIONS_BY_OBJECTS: or(PermissionName.PUBLISH_ITEMS),
		FETCH_COLLECTION_RELATIONS_BY_SUBJECTS: or(PermissionName.VIEW_COLLECTIONS_OVERVIEW),
		FETCH_ITEM_RELATIONS_BY_SUBJECTS: or(PermissionName.PUBLISH_ITEMS),
		INSERT_ITEM_RELATION: or(PermissionName.CREATE_COLLECTIONS),
		DELETE_COLLECTION_RELATIONS_BY_OBJECT: deleteCollectionOrBundle('objectId'),
		DELETE_ITEM_RELATIONS_BY_OBJECT: or(PermissionName.PUBLISH_ITEMS),
		DELETE_COLLECTION_RELATIONS_BY_SUBJECT: deleteCollectionOrBundle('subjectId'),
		DELETE_ITEM_RELATIONS_BY_SUBJECT: or(PermissionName.PUBLISH_ITEMS),
		GET_WORKSPACE_TAB_COUNTS: ALL_LOGGED_IN_USERS,
	},
	PROXY: {
		INSERT_CONTENT_ASSET: or(
			PermissionName.CREATE_ASSIGNMENTS,
			PermissionName.EDIT_ANY_COLLECTIONS,
			PermissionName.EDIT_OWN_COLLECTIONS,
			PermissionName.EDIT_ANY_BUNDLES,
			PermissionName.EDIT_OWN_BUNDLES,
			PermissionName.CREATE_CONTENT_PAGES,
			PermissionName.EDIT_ANY_CONTENT_PAGES,
			PermissionName.EDIT_OWN_CONTENT_PAGES,
			PermissionName.EDIT_INTERACTIVE_TOURS,
			PermissionName.VIEW_ITEMS_OVERVIEW
		),
		DELETE_CONTENT_ASSET: async (user: Avo.User.User, query: string, variables: any) => {
			const assetInfo = await AssetController.info(variables.url);
			if (!assetInfo) {
				throw new BadRequestError('The requested file was not found in the avo database');
			}
			if (assetInfo.owner_id === user.profile.id) {
				return true;
			}
			if (
				assetInfo.content_asset_type_id === 'BUNDLE_COVER' &&
				(AuthService.hasPermission(user, PermissionName.EDIT_OWN_BUNDLES) ||
					AuthService.hasPermission(user, PermissionName.EDIT_ANY_BUNDLES))
			) {
				return true;
			}
			if (
				assetInfo.content_asset_type_id === 'COLLECTION_COVER' &&
				(AuthService.hasPermission(user, PermissionName.EDIT_OWN_COLLECTIONS) ||
					AuthService.hasPermission(user, PermissionName.EDIT_ANY_COLLECTIONS))
			) {
				return true;
			}
			if (
				[
					'CONTENT_PAGE_COVER',
					'CONTENT_BLOCK_FILE',
					'CONTENT_BLOCK_IMAGE',
					'CONTENT_PAGE_DESCRIPTION_IMAGE',
				].includes(assetInfo.content_asset_type_id) &&
				(AuthService.hasPermission(user, PermissionName.EDIT_OWN_CONTENT_PAGES) ||
					AuthService.hasPermission(user, PermissionName.EDIT_ANY_CONTENT_PAGES))
			) {
				return true;
			}
			if (
				assetInfo.content_asset_type_id === 'ASSIGNMENT_DESCRIPTION_IMAGE' &&
				AuthService.hasPermission(user, PermissionName.EDIT_ASSIGNMENTS)
			) {
				return true;
			}
			if (
				assetInfo.content_asset_type_id === 'INTERACTIVE_TOUR_IMAGE' &&
				AuthService.hasPermission(user, PermissionName.EDIT_INTERACTIVE_TOURS)
			) {
				return true;
			}
			if (
				['ITEM_SUBTITLE', 'ITEM_NOTE_IMAGE'].includes(assetInfo.content_asset_type_id) &&
				AuthService.hasPermission(user, PermissionName.VIEW_ITEMS_OVERVIEW)
			) {
				return true;
			}
			return false;
		},
		GET_USER_INFO_BY_USER_EMAIL: ALL_LOGGED_IN_USERS,
		GET_USER_INFO_BY_ID: ALL_LOGGED_IN_USERS,
		GET_USER_BY_LDAP_UUID: ALL_LOGGED_IN_USERS,
		INSERT_USER: ALL_LOGGED_IN_USERS,
		INSERT_PROFILE: ALL_LOGGED_IN_USERS,
		GET_IDP_MAP: ALL_LOGGED_IN_USERS,
		INSERT_IDP_MAP: ALL_LOGGED_IN_USERS,
		DELETE_IDP_MAPS: ALL_LOGGED_IN_USERS,
		GET_USER_BY_IDP_ID: ALL_LOGGED_IN_USERS,
		GET_PROFILE_IDS_BY_USER_UID: ALL_LOGGED_IN_USERS,
		LINK_USER_GROUPS_TO_PROFILE: ALL_LOGGED_IN_USERS,
		UNLINK_ALL_USER_GROUPS_FROM_PROFILE: ALL_LOGGED_IN_USERS,
		GET_USER_ROLE_BY_NAME: ALL_LOGGED_IN_USERS,
		GET_USER_GROUPS: ALL_LOGGED_IN_USERS,
		GET_NOTIFICATION: ALL_LOGGED_IN_USERS,
		UPDATE_USER_LAST_ACCESS_DATE: ALL_LOGGED_IN_USERS,
		UPDATE_AVO_USER: ALL_LOGGED_IN_USERS,
		HAS_CONTENT: ALL_LOGGED_IN_USERS,
		GET_ACTIVE_USERS: ALL_LOGGED_IN_USERS,
		COUNT_ACTIVE_USERS: ALL_LOGGED_IN_USERS,
		GET_COLLECTION_BY_ID: ALL_LOGGED_IN_USERS,
		GET_ITEMS_BY_IDS: ALL_LOGGED_IN_USERS,
		GET_COLLECTIONS_BY_IDS: ALL_LOGGED_IN_USERS,
		GET_EXTERNAL_ID_BY_MEDIAMOSA_ID: ALL_LOGGED_IN_USERS,
		GET_COLLECTIONS_BY_AVO1_ID: ALL_LOGGED_IN_USERS,
		GET_PUBLIC_COLLECTIONS: ALL_LOGGED_IN_USERS,
		GET_COLLECTIONS_LINKED_TO_ASSIGNMENT: ALL_LOGGED_IN_USERS,
		GET_CONTENT_PAGE_BY_PATH: ALL_LOGGED_IN_USERS,
		GET_ITEM_TILE_BY_ID: ALL_LOGGED_IN_USERS,
		GET_ITEM_BY_EXTERNAL_ID: ALL_LOGGED_IN_USERS,
		GET_COLLECTION_TILE_BY_ID: ALL_LOGGED_IN_USERS,
		GET_CONTENT_PAGES_WITH_BLOCKS: ALL_LOGGED_IN_USERS,
		GET_CONTENT_PAGES: ALL_LOGGED_IN_USERS,
		GET_PUBLIC_CONTENT_PAGES: ALL_LOGGED_IN_USERS,
		UPDATE_CONTENT_PAGE_PUBLISH_DATES: ALL_LOGGED_IN_USERS,
		GET_EDUCATION_LEVELS: ALL_LOGGED_IN_USERS,
		INSERT_EVENTS: ALL_LOGGED_IN_USERS,
		GET_INTERACTIVE_TOUR_ROUTE_IDS: ALL_LOGGED_IN_USERS,
		GET_INTERACTIVE_TOUR_WITH_STATUSES: ALL_LOGGED_IN_USERS,
		GET_INTERACTIVE_TOUR_WITHOUT_STATUSES: ALL_LOGGED_IN_USERS,
		GET_ITEM_THUMBNAIL_BY_EXTERNAL_ID: ALL_LOGGED_IN_USERS,
		GET_NAVIGATION_ITEMS: ALL_LOGGED_IN_USERS,
		INSERT_ORGANIZATIONS: ALL_LOGGED_IN_USERS,
		DELETE_ORGANIZATIONS: ALL_LOGGED_IN_USERS,
		GET_ORGANIZATIONS: ALL_LOGGED_IN_USERS,
		DELETE_PROFILE_OBJECTS: ALL_LOGGED_IN_USERS,
		UPDATE_PROFILE_INFO: ALL_LOGGED_IN_USERS,
		GET_COLLECTION_TITLE_AND_DESCRIPTION_BY_ID: ALL_LOGGED_IN_USERS,
		GET_SITE_VARIABLES_BY_NAME: ALL_LOGGED_IN_USERS,
		GET_PROFILES_BY_STAMBOEK: ALL_LOGGED_IN_USERS,
		BULK_SOFT_DELETE_USERS: ALL_LOGGED_IN_USERS,
		BULK_STRIP_USERS: ALL_LOGGED_IN_USERS,
		UPDATE_NAME_AND_MAIL: ALL_LOGGED_IN_USERS,
		UPDATE_MAIL: ALL_LOGGED_IN_USERS,
		BULK_GET_EMAIL_ADDRESSES: ALL_LOGGED_IN_USERS,
		SOFT_DELETE_PUBLIC_CONTENT_FOR_PROFILES: ALL_LOGGED_IN_USERS,
		SOFT_DELETE_PRIVATE_CONTENT_FOR_PROFILES: ALL_LOGGED_IN_USERS,
		TRANSFER_PUBLIC_CONTENT_FOR_PROFILES: ALL_LOGGED_IN_USERS,
		TRANSFER_PRIVATE_CONTENT_FOR_PROFILES: ALL_LOGGED_IN_USERS,
		BULK_UPDATE_USER_BLOCKED_STATUS_BY_PROFILE_IDS: ALL_LOGGED_IN_USERS,
		GET_EMAIL_USER_INFO: ALL_LOGGED_IN_USERS,
		GET_CONTENT_ASSET: ALL_LOGGED_IN_USERS,
		GET_CONTENT_PAGES_BY_IDS: ALL_LOGGED_IN_USERS,
		GET_CONTENT_PAGE_LABELS_BY_TYPE_AND_LABEL: ALL_LOGGED_IN_USERS,
		GET_CONTENT_PAGE_LABELS_BY_TYPE_AND_ID: ALL_LOGGED_IN_USERS,
		GET_ASSIGNMENT_OWNER: ALL_LOGGED_IN_USERS,
		GET_COLLECTION_OWNER: ALL_LOGGED_IN_USERS,
		GET_USER_BLOCK_EVENTS: ALL_LOGGED_IN_USERS,
	},
};
