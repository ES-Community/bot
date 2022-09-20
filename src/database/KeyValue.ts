import DB from "./db";

type JSONScalar = boolean | number | string | null;
type JSONTypes = JSONScalar | JSONObject | JSONArray;
type JSONObject = { [member: string]: JSONTypes };
type JSONArray = JSONTypes[];

export interface IKeyValue {
  key: string;
  value: JSONTypes;
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const KeyValueStore = <U = never>() => DB<U>('kv');

export const KeyValue = {
  length(): Promise<number> {
    return KeyValueStore<number>()
      .count('key', {as: 'key'})
      .then(values => values[0].key as number);
  },

  keys(): Promise<Iterable<string>> {
    return KeyValueStore<string>()
      .select('key')
      .pluck('key');
  },

  values(): Promise<Iterable<JSONTypes>> {
    return KeyValueStore<JSONTypes>()
      .select('value')
      .pluck('value')
      .then(values => values.map((v: string) => JSON.parse(v)));
  },

  entries(): Promise<Iterable<[string, JSONTypes]>> {
    return KeyValueStore<Iterable<IKeyValue>>()
      .select('key', 'value')
      .then(entries => entries.map((kv) => [kv.key, JSON.parse(kv.value)]));
  },

  all(): Promise<Iterable<IKeyValue>> {
    return KeyValueStore<Iterable<IKeyValue>>()
      .select('key', 'value')
      .then(items => {
        for (const item of items) {
          item.value = JSON.parse(item.value);
        }

        return items;
      });
  },

  async has(key: string): Promise<boolean> {
    return KeyValueStore<string>()
      .select('key')
      .where('key', key)
      .first()
      .then(Boolean);
  },

  async get(key: string): Promise<JSONTypes | undefined> {
    const item = await KeyValueStore<string>().select('value').where('key', key).first();
    if (!item) return item;

    return JSON.parse(item.value);
  },

  /// the number returned is the row id from sqlite
  async set(key: string, value: JSONTypes): Promise<number> {
    return KeyValueStore<IKeyValue>().insert({
      key: key,
      value: JSON.stringify(value)
    })
      .onConflict('key')
      .merge()
      .then(items => items[0]);
  },

  // Promise<number> is the number of row deleted
  // it seems .returning is not supported for knex with sqlite,
  // so we cannot return the row deleted
  drop(key: string): Promise<number> {
    return KeyValueStore()
      .where('key', key)
      .delete();
  },

  dropAll(): Promise<void> {
    return KeyValueStore().truncate()
  },
}
