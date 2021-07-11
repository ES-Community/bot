import knex, { Knex } from 'knex';

export class DBClient {
  private pg: Knex;

  constructor(databaseUrl: string) {
    this.pg = knex({
      client: 'pg',
      connection: databaseUrl,
      searchPath: ['public'],
    });
  }

  test() {
    return this.pg.raw('select 1');
  }
}
