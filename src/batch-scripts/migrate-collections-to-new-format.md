# Migrate collections

This script migrates collections from one table to another in the Postgres database via the GraphQL api.

## Database

Explore the database through the hasura console:
http://avo-graphql-qas-sc-avo2.apps.do-prd-okp-m0.do.viaa.be/console

Migrations are imported from the old avo platform by VIAA and are stored into our postgres database under the tables:
* migrate_collections
* migrate_collection_fragments

These collections are formatted according to the old AvO1 format, to use them in the new AvO2 platform we need to convert them to a new format.
The tables containing collections in the new format are:
* app_collections
* app_collection_fragments

## Process

This script will 
1. Read collections from the old migration tables in batches of 1000 items.
2. Convert each item to the new format
3. Write the collection to the new tables

Things that are different between the old and the new collections
* Each collection has a UserId, which is the old user id from AvO1. This needs to be replaced by the new UserId by doing a lookup in the LDAP database.
The LDAP database stores both the old and the new UserId for each user.
* The collection fragments are stored in a more general way in the new system. 
Each fragment consists of an array of content blocks and for each content block a list of fields is stored. 
Theses fields describe what values are needed to fill the content block with data.

## Sync rules
The migration from AvO1 to AvO2 will happen a few times. Once for the Beta version release and again when the AvO2 goes live.
This means we need some rules around what we do about collections that are updated after the previous import.

This table shows the resolution for the state when the second migration happens.
1. Row 1 shows both collections are in both systems and are not changed in either platform since the last migration. So we just leave the collection be.
2. Row 2 shows the collection was changed in AvO2, so we do not override the collection from AvO2 with the collection from AvO1.

| AvO1                 | AvO2                 | resolution           |
|----------------------|----------------------|----------------------|
| collection           | collection           | collection           |
| collection           | changed collection   | changed collection   |
| changed collection   | collection           | changed collection   |
| changed collection 1 | changed collection 2 | changed collection 2 |
| collection           |                      | collection           |
|                      | collection           | collection           |
