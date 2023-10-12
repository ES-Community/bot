/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  // 123061982 - https://github.com/nodejs/node/releases/tag/v20.8.0
  return knex.schema.raw(
    `UPDATE "kv" SET "value" = '123061982' WHERE "key" = 'Last-Cron-Node.js'`,
  );
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
  // 124465449 - https://github.com/nodejs/node/releases/tag/v18.18.1
  return knex.schema.raw(
    `UPDATE "kv" SET "value" = '124465449' WHERE "key" = 'Last-Cron-Node.js'`,
  );
}
