import {
	Schema,
	ValidationOptions,
} from '@hapi/joi';
import {
	NextFunction,
	Request,
	Response,
} from 'express';
import { ISwaggerBuildDefinitionModel } from 'swagger-express-ts/swagger.builder';

import { ValidationError } from './helpers/validation/error';

export interface IRequest extends Request {
	data?: {
		/* tslint:disable no-any */
		body: any;
		headers: any;
		params: any;
		query: any;
		/* tslint:enable no-any */
	};
}
export type IResponse = Response;
export type INext = NextFunction;

export interface IValidationPreset {
	schema: Schema;
	options: ValidationOptions;
}
export type IValidationOrigin = 'body' | 'headers' | 'params' | 'query';
export type IValidationError = ValidationError;

export interface IInternalServerErrorDetail {
	err: string;
}

export interface IInternalServerError {
	details?: IInternalServerErrorDetail[];
	host: string;
	identifier: string;
	message: string;
	name: string;
	innerException?: any;
	additionalInfo?: any;
	stack: string;
	statusCode: number;
	timestamp: string;
}
export type IBodyError = IInternalServerError;
export type IHeadersError = IInternalServerError;
export type IParamsError = IInternalServerError;
export type IQueryError = IInternalServerError;
export type IUnauthorizedError = IInternalServerError;
export type IForbiddenError = IInternalServerError;
export type INotFoundError = IInternalServerError;
export type IConflictError = IInternalServerError;
export type IErrors =
	IInternalServerError |
	IBodyError |
	IHeadersError |
	IParamsError |
	IQueryError |
	IUnauthorizedError |
	IForbiddenError |
	INotFoundError |
	IConflictError;

// Swagger

export interface ISwaggerModels {
	[key: string]: ISwaggerBuildDefinitionModel;
}
