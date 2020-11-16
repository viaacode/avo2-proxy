import { every, some } from 'lodash';

import { Avo } from '@viaa/avo2-types';

import { PermissionName } from '../../shared/permissions';
import { AuthService } from '../auth/service';

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

const ALL_LOGGED_IN_USERS = () => Promise.resolve(true);

export const QUERY_PERMISSIONS: {
	CLIENT: { [queryName: string]: IsAllowed };
	PROXY: { [queryName: string]: IsAllowed };
} = {
	CLIENT: {
		GET_COLLECTIONS: or(
			PermissionName.VIEW_ANY_PUBLISHED_COLLECTIONS,
			PermissionName.VIEW_ANY_UNPUBLISHED_COLLECTIONS,
			PermissionName.VIEW_ANY_PUBLISHED_BUNDLES,
			PermissionName.VIEW_ANY_UNPUBLISHED_BUNDLES,
			PermissionName.VIEW_OWN_BUNDLES,
			PermissionName.VIEW_OWN_COLLECTIONS
		),
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
			PermissionName.DELETE_ANY_BUNDLES,
			PermissionName.DELETE_OWN_COLLECTIONS,
			PermissionName.DELETE_OWN_BUNDLES
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
		INSERT_CONTENT_BLOCKS: or(
			PermissionName.CREATE_CONTENT_PAGES,
			PermissionName.EDIT_ANY_CONTENT_PAGES,
			PermissionName.EDIT_OWN_CONTENT_PAGES
		),
		UPDATE_CONTENT_BLOCK: or(
			PermissionName.CREATE_CONTENT_PAGES,
			PermissionName.EDIT_ANY_CONTENT_PAGES,
			PermissionName.EDIT_OWN_CONTENT_PAGES
		),
		DELETE_CONTENT_BLOCK: or(PermissionName.DELETE_ANY_CONTENT_PAGES),
		GET_CONTENT_PAGE_LABELS: or(PermissionName.EDIT_CONTENT_PAGE_LABELS),
		DELETE_CONTENT_PAGE_LABEL: or(PermissionName.EDIT_CONTENT_PAGE_LABELS),
		GET_CONTENT_PAGE_LABEL_BY_ID: ALL_LOGGED_IN_USERS,
		GET_CONTENT_PAGE_LABELS_BY_TYPE_AND_LABEL: ALL_LOGGED_IN_USERS,
		GET_CONTENT_PAGE_LABELS_BY_TYPE_AND_ID: ALL_LOGGED_IN_USERS,
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
		UPDATE_CONTENT_BY_ID: or(
			PermissionName.EDIT_CONTENT_PAGE_LABELS,
			PermissionName.EDIT_ANY_CONTENT_PAGES,
			PermissionName.EDIT_OWN_CONTENT_PAGES
		),
		INSERT_CONTENT: or(
			PermissionName.EDIT_ANY_CONTENT_PAGES,
			PermissionName.EDIT_OWN_CONTENT_PAGES
		),
		DELETE_CONTENT: or(PermissionName.DELETE_ANY_CONTENT_PAGES),
		GET_PERMISSIONS_FROM_CONTENT_PAGE_BY_PATH: or(PermissionName.EDIT_NAVIGATION_BARS),
		GET_CONTENT_LABELS_BY_CONTENT_TYPE: or(
			PermissionName.EDIT_ANY_CONTENT_PAGES,
			PermissionName.EDIT_OWN_CONTENT_PAGES
		),
		INSERT_CONTENT_LABEL_LINKS: or(
			PermissionName.EDIT_ANY_CONTENT_PAGES,
			PermissionName.EDIT_OWN_CONTENT_PAGES
		),
		DELETE_CONTENT_LABEL_LINKS: or(
			PermissionName.EDIT_ANY_CONTENT_PAGES,
			PermissionName.EDIT_OWN_CONTENT_PAGES
		),
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
		GET_CONTENT_COUNTS_FOR_USERS: or(PermissionName.EDIT_ANY_USER),
		GET_ASSIGNMENT_BY_ID: or(PermissionName.EDIT_ASSIGNMENTS),
		GET_ASSIGNMENT_BY_CONTENT_ID_AND_TYPE: or(
			PermissionName.EDIT_ASSIGNMENTS,
			PermissionName.EDIT_ANY_COLLECTIONS,
			PermissionName.EDIT_ANY_BUNDLES
		),
		GET_ASSIGNMENTS_BY_OWNER_ID: or(PermissionName.EDIT_ASSIGNMENTS),
		GET_ASSIGNMENTS_BY_RESPONSE_OWNER_ID: or(PermissionName.CREATE_ASSIGNMENT_RESPONSE),
		GET_ASSIGNMENT_RESPONSES: or(PermissionName.EDIT_ASSIGNMENTS),
		GET_ASSIGNMENT_WITH_RESPONSE: or(PermissionName.VIEW_ASSIGNMENTS),
		INSERT_ASSIGNMENT: or(PermissionName.EDIT_ASSIGNMENTS),
		UPDATE_ASSIGNMENT: or(PermissionName.EDIT_ASSIGNMENTS),
		UPDATE_ASSIGNMENT_ARCHIVE_STATUS: or(PermissionName.EDIT_ASSIGNMENTS),
		UPDATE_ASSIGNMENT_RESPONSE_SUBMITTED_STATUS: or(PermissionName.CREATE_ASSIGNMENT_RESPONSE),
		DELETE_ASSIGNMENT: or(PermissionName.EDIT_ASSIGNMENTS),
		INSERT_ASSIGNMENT_RESPONSE: or(PermissionName.CREATE_ASSIGNMENT_RESPONSE),
		GET_COLLECTION_BY_ID: or(PermissionName.CREATE_BUNDLES),
		UPDATE_COLLECTION: or(
			PermissionName.EDIT_OWN_COLLECTIONS,
			PermissionName.EDIT_ANY_COLLECTIONS,
			PermissionName.EDIT_OWN_BUNDLES,
			PermissionName.EDIT_ANY_BUNDLES
		),
		INSERT_COLLECTION: or(
			PermissionName.EDIT_OWN_COLLECTIONS,
			PermissionName.EDIT_ANY_COLLECTIONS,
			PermissionName.EDIT_OWN_BUNDLES,
			PermissionName.EDIT_ANY_BUNDLES
		),
		DELETE_COLLECTION: or(
			PermissionName.DELETE_OWN_COLLECTIONS,
			PermissionName.DELETE_ANY_COLLECTIONS,
			PermissionName.DELETE_OWN_BUNDLES,
			PermissionName.DELETE_ANY_BUNDLES
		),
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
		GET_COLLECTIONS_BY_OWNER: async (user: Avo.User.User, query: string, variables: any) => {
			return variables.owner_profile_id === user.profile.id;
		},
		GET_PUBLIC_COLLECTIONS: or(PermissionName.VIEW_ANY_PUBLISHED_COLLECTIONS),
		GET_PUBLIC_COLLECTIONS_BY_ID: or(PermissionName.EDIT_CONTENT_PAGE_LABELS),
		GET_PUBLIC_COLLECTIONS_BY_TITLE: or(PermissionName.EDIT_CONTENT_PAGE_LABELS),
		GET_COLLECTION_TITLES_BY_OWNER: async (user: Avo.User.User, query: string, variables: any) => {
			return AuthService.hasPermission(user, PermissionName.CREATE_COLLECTIONS)
				&& variables.owner_profile_id === user.profile.id;
		},
		GET_BUNDLE_TITLES_BY_OWNER: async (user: Avo.User.User, query: string, variables: any) => {
			return AuthService.hasPermission(user, PermissionName.CREATE_BUNDLES)
				&& variables.owner_profile_id === user.profile.id;
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
			PermissionName.EDIT_COLLECTION_LABELS,
			PermissionName.EDIT_BUNDLE_LABELS
		),
		GET_COLLECTION_BY_TITLE_OR_DESCRIPTION: or(PermissionName.),
		GET_COLLECTIONS_BY_FRAGMENT_ID: or(PermissionName.),
		INSERT_COLLECTION_RELATION: or(PermissionName.),
		GET_EDUCATION_LEVELS: or(PermissionName.),
		GET_SUBJECTS: or(PermissionName.),
		GET_ASSIGNMENT_LABELS_BY_PROFILE_ID: or(PermissionName.),
		INSERT_ASSIGNMENT_LABELS: or(PermissionName.),
		UPDATE_ASSIGNMENT_LABEL: or(PermissionName.),
		DELETE_ASSIGNMENT_LABELS: or(PermissionName.),
		LINK_ASSIGNMENT_LABELS_FROM_ASSIGNMENT: or(PermissionName.),
		UNLINK_ASSIGNMENT_LABELS_FROM_ASSIGNMENT: or(PermissionName.),
		GET_ALL_ASSIGNMENT_LABEL_COLORS: or(PermissionName.),
		INSERT_ITEM_BOOKMARK: or(PermissionName.),
		INSERT_COLLECTION_BOOKMARK: or(PermissionName.),
		REMOVE_ITEM_BOOKMARK: or(PermissionName.),
		REMOVE_COLLECTION_BOOKMARK: or(PermissionName.),
		INCREMENT_ITEM_VIEWS: or(PermissionName.),
		INCREMENT_COLLECTION_VIEWS: or(PermissionName.),
		INIT_ITEM_VIEWS: or(PermissionName.),
		INIT_COLLECTION_VIEWS: or(PermissionName.),
		INCREMENT_ITEM_PLAYS: or(PermissionName.),
		INCREMENT_COLLECTION_PLAYS: or(PermissionName.),
		GET_ITEM_VIEWS: or(PermissionName.),
		GET_COLLECTION_VIEWS: or(PermissionName.),
		GET_ITEM_PLAYS: or(PermissionName.),
		GET_COLLECTION_PLAYS: or(PermissionName.),
		INIT_ITEM_PLAYS: or(PermissionName.),
		INIT_COLLECTION_PLAYS: or(PermissionName.),
		GET_ITEM_BOOKMARK_VIEW_PLAY_COUNTS: or(PermissionName.),
		GET_COLLECTION_BOOKMARK_VIEW_PLAY_COUNTS: or(PermissionName.),
		GET_MULTIPLE_ITEM_VIEW_COUNTS: or(PermissionName.),
		GET_MULTIPLE_COLLECTION_VIEW_COUNTS: or(PermissionName.),
		GET_BOOKMARKS_FOR_USER: or(PermissionName.),
		GET_BOOKMARK_STATUSES: or(PermissionName.),
		GET_NOTIFICATION_INTERACTIVE_TOUR_SEEN: or(PermissionName.),
		INSERT_NOTIFICATION_INTERACTIVE_TOUR_SEEN: or(PermissionName.),
		UPDATE_NOTIFICATION_INTERACTIVE_TOUR_SEEN: or(PermissionName.),
		GET_NOTIFICATION: or(PermissionName.),
		INSERT_NOTIFICATION: or(PermissionName.),
		UPDATE_NOTIFICATION: or(PermissionName.),
		GET_ALL_ORGANISATIONS: or(PermissionName.),
		GET_DISTINCT_ORGANISATIONS: or(PermissionName.),
		GET_USERS_IN_COMPANY: or(PermissionName.),
		FETCH_COLLECTION_RELATIONS_BY_OBJECTS: or(PermissionName.),
		FETCH_ITEM_RELATIONS_BY_OBJECTS: or(PermissionName.),
		FETCH_COLLECTION_RELATIONS_BY_SUBJECTS: or(PermissionName.),
		FETCH_ITEM_RELATIONS_BY_SUBJECTS: or(PermissionName.),
		INSERT_ITEM_RELATION: or(PermissionName.),
		DELETE_COLLECTION_RELATIONS_BY_OBJECT: or(PermissionName.),
		DELETE_ITEM_RELATIONS_BY_OBJECT: or(PermissionName.),
		DELETE_COLLECTION_RELATIONS_BY_SUBJECT: or(PermissionName.),
		DELETE_ITEM_RELATIONS_BY_SUBJECT: or(PermissionName.),
		GET_WORKSPACE_TAB_COUNTS: or(PermissionName.),
	},
	PROXY: {
		INSERT_CONTENT_ASSET: or(PermissionName.),
		DELETE_CONTENT_ASSET: or(PermissionName.),
		GET_USER_INFO_BY_USER_EMAIL: or(PermissionName.),
		GET_USER_INFO_BY_ID: or(PermissionName.),
		GET_USER_BY_LDAP_UUID: or(PermissionName.),
		INSERT_USER: or(PermissionName.),
		INSERT_PROFILE: or(PermissionName.),
		GET_IDP_MAP: or(PermissionName.),
		INSERT_IDP_MAP: or(PermissionName.),
		DELETE_IDP_MAPS: or(PermissionName.),
		GET_USER_BY_IDP_ID: or(PermissionName.),
		GET_PROFILE_IDS_BY_USER_UID: or(PermissionName.),
		LINK_USER_GROUPS_TO_PROFILE: or(PermissionName.),
		UNLINK_ALL_USER_GROUPS_FROM_PROFILE: or(PermissionName.),
		GET_USER_ROLE_BY_NAME: or(PermissionName.),
		GET_USER_GROUPS: or(PermissionName.),
		GET_NOTIFICATION: or(PermissionName.),
		UPDATE_USER_LAST_ACCESS_DATE: or(PermissionName.),
		UPDATE_AVO_USER: or(PermissionName.),
		HAS_CONTENT: or(PermissionName.),
		GET_ACTIVE_USERS: or(PermissionName.),
		COUNT_ACTIVE_USERS: or(PermissionName.),
		GET_COLLECTION_BY_ID: or(PermissionName.),
		GET_ITEMS_BY_IDS: or(PermissionName.),
		GET_COLLECTIONS_BY_IDS: or(PermissionName.),
		GET_EXTERNAL_ID_BY_MEDIAMOSA_ID: or(PermissionName.),
		GET_COLLECTIONS_BY_AVO1_ID: or(PermissionName.),
		GET_PUBLIC_COLLECTIONS: or(PermissionName.),
		GET_COLLECTIONS_LINKED_TO_ASSIGNMENT: or(PermissionName.),
		GET_CONTENT_PAGE_BY_PATH: or(PermissionName.),
		GET_ITEM_TILE_BY_ID: or(PermissionName.),
		GET_ITEM_BY_EXTERNAL_ID: or(PermissionName.),
		GET_COLLECTION_TILE_BY_ID: or(PermissionName.),
		GET_CONTENT_PAGES_WITH_BLOCKS: or(PermissionName.),
		GET_CONTENT_PAGES: or(PermissionName.),
		GET_PUBLIC_CONTENT_PAGES: or(PermissionName.),
		UPDATE_CONTENT_PAGE_PUBLISH_DATES: or(PermissionName.),
		GET_EDUCATION_LEVELS: or(PermissionName.),
		INSERT_EVENTS: or(PermissionName.),
		GET_INTERACTIVE_TOUR_ROUTE_IDS: or(PermissionName.),
		GET_INTERACTIVE_TOUR_WITH_STATUSES: or(PermissionName.),
		GET_INTERACTIVE_TOUR_WITHOUT_STATUSES: or(PermissionName.),
		GET_ITEM_THUMBNAIL_BY_EXTERNAL_ID: or(PermissionName.),
		GET_NAVIGATION_ITEMS: or(PermissionName.),
		INSERT_ORGANIZATIONS: or(PermissionName.),
		DELETE_ORGANIZATIONS: or(PermissionName.),
		GET_ORGANIZATIONS: or(PermissionName.),
		DELETE_PROFILE_OBJECTS: or(PermissionName.),
		UPDATE_PROFILE_INFO: or(PermissionName.),
		GET_COLLECTION_TITLE_AND_DESCRIPTION_BY_ID: or(PermissionName.),
		GET_SITE_VARIABLES_BY_NAME: or(PermissionName.),
		GET_PROFILES_BY_STAMBOEK: or(PermissionName.),
		BULK_DELETE_USERS: or(PermissionName.),
		BULK_STRIP_USERS: or(PermissionName.),
		UPDATE_NAME_AND_MAIL: or(PermissionName.),
		UPDATE_MAIL: or(PermissionName.),
		BULK_GET_EMAIL_ADDRESSES: or(PermissionName.),
		DELETE_PUBLIC_CONTENT_FOR_PROFILES: or(PermissionName.),
		DELETE_PRIVATE_CONTENT_FOR_PROFILES: or(PermissionName.),
		TRANSFER_PUBLIC_CONTENT_FOR_PROFILES: or(PermissionName.),
		TRANSFER_PRIVATE_CONTENT_FOR_PROFILES: or(PermissionName.),
		BULK_UPDATE_USER_BLOCKED_STATUS_BY_PROFILE_IDS: or(PermissionName.),
		GET_EMAIL_USER_INFO: or(PermissionName.),
	},
};
