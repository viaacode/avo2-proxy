import { EventAction, EventObjectType, EventSubjectType } from './controller';

// TODO switch subtypes to typings repo after update to typings v2.22.0
export interface LogEvent {
	id?: string;
	component: 'webapp' | 'server';
	parent_id: string | null;
	namespace: 'avo';
	action: EventAction;
	object_type: EventObjectType;
	object: string | null;
	subject_type: EventSubjectType;
	subject: string; // entity doing the modification
	subject_ip: string | null;
	source_url: string; // eg: url when the event was triggered
	message: any | null; // user played item xxx on avo
	occurred_at: string | null; // iso timestamp
	created_at?: string; // defaults to now()
	trace_id: string | null;
	is_system: boolean | null; // defaults to false
}
