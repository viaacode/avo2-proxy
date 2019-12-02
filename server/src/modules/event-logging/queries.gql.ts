export const INSERT_EVENTS = `
	mutation insertEventLogEntry($eventLogEntries: [avo_events_insert_input!]!) {
		insert_avo_events(objects: $eventLogEntries) {
			affected_rows
		}
	}
`;
