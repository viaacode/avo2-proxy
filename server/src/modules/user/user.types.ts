// TODO use types from typings library after update to v2.27.0
export type UserDeleteOption =
	| 'DELETE_PRIVATE_KEEP_NAME'
	| 'TRANSFER_PUBLIC'
	| 'TRANSFER_ALL'
	| 'ANONYMIZE_PUBLIC'
	| 'DELETE_ALL';

// TODO use types from typings library after update to v2.27.0
export interface BulkDeleteUsersBody {
	profileIds: string[];
	deleteOption: UserDeleteOption;
	transferToProfileId?: string;
}

// TODO use types from typings library after update to v2.27.0
export interface BulkBlockUsersBody {
	profileIds: string[];
	isBlocked: boolean;
}

export interface ProfileBlockEvents {
	blockedAt: string | undefined;
	unblockedAt: string | undefined;
}
