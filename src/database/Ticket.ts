import DB from './database.ts';
import assert from 'node:assert';

export const TicketsStore = () =>
  DB<{ id: number; is_open: boolean }>('tickets');

export const Tickets = {
  async create() {
    const [row] = await TicketsStore().insert({}).returning('id');

    assert.ok(row);

    return row.id;
  },

  async close(id: number) {
    await TicketsStore().update({ is_open: false }).where('id', id);
  },
};
