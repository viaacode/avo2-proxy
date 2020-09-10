export type IEnvs = 'local' | 'test' | 'development' | 'staging' | 'production';
import winston from 'winston';

export interface IStateConfig {
	env: IEnvs;
	docs: boolean;
	production: boolean;
	test: boolean;
}

export interface IServerConfig {
	host: string;
	port: number;
	timezone: string;
}

export interface IConfig {
	state: IStateConfig;
	server: IServerConfig;
	logger: winston.Logger;
}
