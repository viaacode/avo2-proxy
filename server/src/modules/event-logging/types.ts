import { Avo } from '@viaa/avo2-types';

export interface LogEvent {
	id?: string;
	component: 'webapp' | 'server';
	parent_id: string | null;
	namespace: 'avo';
	action: Avo.EventLogging.Action;
	object_type: Avo.EventLogging.ObjectType;
	object: string | null;
	subject_type: Avo.EventLogging.SubjectType;
	subject: string; // entity doing the modification
	subject_ip: string | null;
	source_url: string; // eg: url when the event was triggered
	message: any | null; // user played item xxx on avo
	occurred_at: string | null; // iso timestamp
	created_at?: string; // defaults to now()
	trace_id: string | null;
	is_system: boolean | null; // defaults to false
}
