export interface LogEvent {
	id?: string;
	namespace: 'avo';
	component: 'client';
	agent_id: '7680d455-c6ff-42ab-b09c-9487bcc133e0';
	event_label_id: number;
	event_timestamp: string;
	event_subject: {
		type: 'user' | 'system';
		identifier: string;
	}; // entity doing the modification
	event_object: {
		type: 'item' | 'collection' | 'bundle' | 'user';
		identifier: string;
	}; // entity being modified
	event_message: any; // user played item xxx on avo
	event_source: string; // eg: url when the event was triggered
	record_created_at?: string; // defaults to now()
	ip: string;
}

export interface EventLabel {
	id: number;
	name: EventName;
	category: EventCategory;
}
