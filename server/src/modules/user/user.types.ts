export type UserDeleteOption =
	| 'DELETE_PRIVATE_KEEP_NAME'
	| 'TRANSFER_PUBLIC'
	| 'TRANSFER_ALL'
	| 'ANONYMIZE_PUBLIC'
	| 'DELETE_ALL';

export interface BulkDeleteUsersBody {
	profileIds: string[];
	deleteOption: UserDeleteOption;
	transferToProfileId?: string;
}