# Het Archief voor Onderwijs - backend NodeJS proxy

## Synopsis

Deze repo bevat de NodeJS service die de communicatie regelt tussen de AvO frontend applicaties enerzijds en de backend services anderzijds.

![Overview of the avo backend and frontend applications](avo-overview.png?raw=true)


## Technical

|Role              | Handle / username|
| -------------    |--------------| 
|Principal/Owner   | Bart Debunne <bart.debunne@viaa.be>  | 
|Lead Developer    | Enzo Eghermanne <enzo.eghermanne@studiohyperdrive.be> |
|Lead Developer    | Bert Verhelst <bert.verhelst@studiohyperdrive.be> |

**Code Review:**

## Functional

De NodeJS applicatie zal vooral de volgende zaken voorzien:
* Proxy search requests van de frontend apps naar de graphQL en Elasticsearch services
* Authenticatie voor inloggen adhv info uit de LDAP / smartschool, klasse API's
* Extra informatie voor de gebruikers van de applicatie bijhouden in de postgres database

## Server

|               | QAS           | PRD      |
| ------------- |:-------------:| :-----:  |
| **host**      | TODO          | TODO     |

## Stack

#### Backend

NodeJS in Typescript and express.js

### Frontend

* Frontend applicatie voor leerkrachten: React
    * https://github.com/viaacode/avo2-client
* Frontend applicatie voor viaa medewerkers: React
    * https://github.com/viaacode/avo2-admin

## Logging and monitoring

#### Backend

// TODO

## Deployment/Installation

#### Prerequisites

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
