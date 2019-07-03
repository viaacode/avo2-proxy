import { Avo } from '@viaa/avo2-types';

export const DUMMY_OWNER: Avo.User.Response = {
	id: 1,
	user_id: '1',
	group_id: 1,
	org_id: '1',
	fn: 'marc',
	sn: 'jansens',
	alias: 'markske',
	alternative_email: 'marc.jansens@vmail.be',
	created_at: Date.now().toString(),
	updated_at: Date.now().toString(),
	avatar: 'http://master.viaa2.mono.digital/images/avatars/avatar-1.jpg',
};
