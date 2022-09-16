import knex from 'knex';
import * as Environments from '../../knexfile.js';

const env = process.env.NODE_ENV || 'development'

export const DB = knex(Environments[env]);
export default DB;