import knex, { Knex } from 'knex';
import * as Environments from '../../knexfile.js';

export const env = process.env.NODE_ENV || 'development';
export const config: Knex.Config = Environments[env];

export const DB = knex(config);
export default DB;
