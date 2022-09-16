// Update with your config settings.

/**
 * @type { Object.<string, import("knex").Knex.Config> }
 */
module.exports = {
  development: {
    client: 'better-sqlite3',
    connection: {
      filename: './dev.sqlite3'
    }
  },

  staging: {
    client: 'better-sqlite3',
    connection: {
      filename: './staging.sqlite3'
    }
  },

  production: {
    client: 'better-sqlite3',
    connection: {
      filename: './prod.sqlite3'
    }
  }
};
