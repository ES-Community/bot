// Update with your config settings.

/**
 * @type { Object.<string, import("knex").Knex.Config> }
 */
module.exports = {
  development: {
    client: 'better-sqlite3',
    connection: {
      filename: './data/dev.sqlite3',
    },
    useNullAsDefault: true,
  },

  staging: {
    client: 'better-sqlite3',
    connection: {
      filename: './data/staging.sqlite3',
    },
    useNullAsDefault: true,
  },

  production: {
    client: 'better-sqlite3',
    connection: {
      filename: './data/prod.sqlite3',
    },
    useNullAsDefault: true,
  },

  test: {
    client: 'better-sqlite3',
    connection: {
      filename: './data/test.sqlite3',
    },
    useNullAsDefault: true,
  },
};
