import { EventCategory, EventName } from '@viaa/avo2-types/types/event-logging/types';
import { Avo } from '@viaa/avo2-types';

export interface EventLabel {
	value: EventName;
	category: EventCategory;
}

export interface LogEvent {
	id?: string;
	parent_id: string | null;
	event_label: EventName;
	namespace: 'avo';
	component: 'client';
	event_subject: string; // entity doing the modification
	event_subject_type: Avo.EventLogging.SubjectType;
	event_object: string;
	event_object_type: Avo.EventLogging.ObjectType; // entity being modified
	event_source: string; // eg: url when the event was triggered
	event_message: any | null; // user played item xxx on avo
	ip: string | null;
	event_timestamp: string;
	record_created_at?: string; // defaults to now()
	trace_id: string | null;
	is_system: boolean | null; // defaults to false
}
