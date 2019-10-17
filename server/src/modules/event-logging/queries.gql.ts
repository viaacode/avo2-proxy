export const INSERT_EVENTS = `
	mutation insertEventLogEntry($eventLogEntries: [events_insert_input!]!) {
		insert_events(objects: $eventLogEntries) {
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
