export const INSERT_EVENTS = `
	mutation insertEventLogEntry($eventLogEntries: [avo_events_insert_input!]!) {
		insert_avo_events(objects: $eventLogEntries) {
			affected_rows
		}
	}
`;

export const GET_EVENT_LABELS = `
	query getEventLabels {
		event_labels {
			category
			name
			id
		}
	}
`;
