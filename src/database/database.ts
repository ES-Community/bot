import type { Knex } from 'knex';
// @ts-expect-error Import directly from the mjs file because knex exports aren't configured correctly.
import { knex } from 'knex/knex.mjs';
import Environments from '../../knexfile.js';

export const executionEnvironment = process.env.NODE_ENV || 'development';
export const config: Knex.Config = Environments[executionEnvironment];

export const DB: Knex = knex(config);
export default DB;
