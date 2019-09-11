# Het Archief voor Onderwijs - backend NodeJS proxy

## Synopsis

This repo contains the NodeJS backend service that handles the communication between
* the AvO frontend applications ()
    * Client
    * Admin

and
* the backend services
    * Elasticsearch
    * GraphQL
    * LDAP api

![Overview of the avo backend and frontend applications](avo-overview.png?raw=true)


## Technical

|Role              | Handle / username|
| -------------    |--------------| 
|Principal/Owner   | Bart Debunne <bart.debunne@viaa.be>  | 
|Lead Developer    | Bert Verhelst <bert.verhelst@studiohyperdrive.be> |
|Lead Developer    | Enzo Eghermanne <enzo.eghermanne@studiohyperdrive.be> |
|Developer         | Benjamin Naesen <benjamin.naesen@studiohyperdrive.be> |

**Code Review:**

## Functional

The NodeJS services will provide the following features:
* Proxy search requests from the frontend apps to graphQL and Elasticsearch services
* Authentication for login using information from the LDAP API, Smartschool api, klasse api
* Track extra information for logged in users. Eg: bookmarks, app permissions

## Server

|               | QAS           | PRD      |
| ------------- |:-------------:| :-----:  |
| **host**      | TODO          | TODO     |

## Stack

#### Backend

NodeJS in Typescript and express.js

### Frontend

* Frontend application for teachers, students, content providers, ...: React
    * https://github.com/viaacode/avo2-client
* Frontend application for viaa employees: React
    * https://github.com/viaacode/avo2-admin

## Logging and monitoring

#### Backend

// TODO

## Deployment/Installation

#### Prerequisites

Ensure that the VIAA provided postgres db has been setup to accept sessions by following the readme here:
https://www.npmjs.com/package/connect-pg-simple

#### Backend

The deployment happens through Jenkins which will build a docker image and upload it to the viaa docker repository.

## Usage

#### Examples

See postman collection (TODO add link)

### Troubleshooting

## Process Flow

#### Flow

#### Diagram

![Overview of the avo backend and frontend applications](avo-overview.png?raw=true)
