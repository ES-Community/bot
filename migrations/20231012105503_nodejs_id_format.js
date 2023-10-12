/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  // 124465449 - https://github.com/nodejs/node/releases/tag/v18.18.1
  return knex.schema.raw(
    `UPDATE "kv" SET "value" = '124465449' WHERE "key" = 'Last-Cron-Node.js'`,
  );
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
  return knex.schema.raw(
    `UPDATE "kv" SET "value" = '"tag:github.com,2008:Repository/27193779/v18.18.1"' WHERE "key" = 'Last-Cron-Node.js'`,
  );
}
