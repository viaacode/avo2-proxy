import DataService from '../modules/data/service';
import { gql } from 'apollo-boost';
import { Avo } from '@viaa/avo2-types';

const GET_ALL_MIGRATE_COLLECTIONS = gql`
	query getAllMigrateCollections($offset: Int, $limit: Int) {
		migrate_collections(offset: $offset, limit: $limit) {
			id
			d_ownerid
			title
			created_at
			description
			fragments {
				collection_id
				created_at
				custom_description
				custom_title
				end_oc
				external_id {
					external_id
					id
					mediamosa_id
					type_label
				}
				id
				mediamosa_id
				position
				start_oc
				updated_at
			}
			is_public
			lom_references {
				id
				lom_element
				lom_value
				mediamosa_id
			}
			mediamosa_id
			organisation_id
			owner_id {
				created_at
				id
				mail
				name
				role_id
				status_id
			}
			type_id
			updated_at
		}
	}
`;

const INSERT_COLLECTIONS = gql`mutation($collections:[app_collections_insert_input!]!) {
  insert_app_collections(objects: $collections, on_conflict: {
      constraint: id,
      update_columns: [
      	title
        description
        created_at
        updated_at
        is_public
      ]
    }) {
  }
}`;

export async function migrate() {
	let collections: Avo.Collection.MigrateCollection[] = [];
	let offset = 0;
	const limit = 1000;
	do {
		console.log(`getting collections: ${offset} - ${limit}`);
		collections = (await DataService.execute(GET_ALL_MIGRATE_COLLECTIONS, { offset, limit })).migrate_collections;
		const newCollections = collections.map((collection: Avo.Collection.MigrateCollection) => {
			const introFragment: Avo.Collection.Fragment = {
				collection_id: collection.id,
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
				type: 'Intro',
				position: 1,
				fields: [
					{
						name: 'title',
						label: 'Titel',
						editorType: 'string',
						value: 'Inleiding',
						required: false,
					},
					{
						name: 'text',
						label: 'Beschrijving',
						editorType: 'textarea',
						value: collection.description,
						required: true,
					},
				],
			} as Avo.Collection.Fragment; // Fragment temporarily doesn't have an id yet
			const fragments = collection.fragments.map((fragment) => {
				const newFragment: Avo.Collection.Fragment = {
					id: fragment.id,
					collection_id: fragment.collection_id,
					created_at: fragment.created_at,
					updated_at: fragment.updated_at,
					type: 'VideoTitleTextButton',
					position: fragment.position + 1, // Need to add intro block
					fields: [
						{
							name: 'external_id',
							label: 'Media id',
							editorType: 'none',
							value: fragment.external_id,
							required: true,
						},
						{
							name: 'mediamosa_id',
							label: 'Media mosa id',
							editorType: 'none',
							value: fragment.mediamosa_id,
							required: true,
						},
						{
							name: 'custom_title',
							label: 'Eigen titel',
							editorType: 'string',
							value: fragment.custom_title,
							required: false,
						},
						{
							name: 'custom_description',
							label: 'Eigen beschrijving',
							editorType: 'textarea',
							value: fragment.custom_description,
							required: false,
						},
						{
							name: 'start_oc',
							label: 'Begin fragment',
							editorType: 'none',
							value: fragment.start_oc,
							required: false,
						},
						{
							name: 'end_oc',
							label: 'Einde fragment',
							editorType: 'none',
							value: fragment.end_oc,
							required: false,
						},
					],
				};
				return newFragment;
			});
			// New collections do not have a description, this is stored in blocks now
			const {description, ...oldCollection} = collection;
			const newCollection: Avo.Collection.Response = {
				...oldCollection,
				fragments: [introFragment, ...fragments],
				is_migrated_collection: true,
			};
			return newCollection;
		});

		// TODO write new collection to database table: content_blocks and app_collection_fragments
		const response = await DataService.execute(INSERT_COLLECTIONS, {collections: newCollections});

		offset += limit;
	} while (collections.length === 1000);
	console.log('finished converting collections to new format.');
}
