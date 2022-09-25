// Update with your config settings.

/**
 * @type { Object.<string, import("knex").Knex.Config> }
 */
module.exports = {
  development: {
    client: 'better-sqlite3',
    connection: {
      filename: './dev.sqlite3'
    },
    useNullAsDefault: true
  },

  staging: {
    client: 'better-sqlite3',
    connection: {
      filename: './staging.sqlite3'
    },
    useNullAsDefault: true
  },

  production: {
    client: 'better-sqlite3',
    connection: {
      filename: './prod.sqlite3'
    },
    useNullAsDefault: true
  },
  
  test: {
    client: 'better-sqlite3',
    connection: {
      filename: './test.sqlite3'
    },
    useNullAsDefault: true
  },
};
