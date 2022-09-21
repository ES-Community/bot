import DB from "./db";

type JSONScalar = boolean | number | string | null;
type JSONTypes = JSONScalar | JSONObject | JSONArray;
type JSONObject = { [member: string]: JSONTypes };
type JSONArray = JSONTypes[];

export interface IKeyValue {
  key: string;
  value: JSONTypes;
}

export enum SearchFlag {
  Exact = 0b00,
  StartsWith = 0b01,
  EndsWith = 0b10,
  Contains = 0b11,
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const KeyValueStore = <U = never>() => DB<U>('kv');

export const KeyValue = {
  size(): Promise<number> {
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

  /**
   * Search in keys with LIKE operator
   * @param likeKey - case-insensitive
   * @param flag - a 2 binary mask. 0b10 for left %, 0b01 for right %, 0b11 for both
   */
  search(likeKey :string, flag: SearchFlag = SearchFlag.Contains): Promise<IKeyValue[]> {
    const left = (0b10 & flag) ? '%' : '';
    const right = (0b01 & flag) ? '%' : '';

    const likeKeyEscaped = likeKey
      .replace(/%/g, '\\%')
      .replace(/_/g, '\\_')
    const likePart = `${left}${likeKeyEscaped}${right}`;

    return KeyValueStore<IKeyValue[]>()
      .select('key', 'value')
      .whereRaw(`\`key\` LIKE ? ESCAPE ?`, [likePart, '\\'])
      .then(items => {
        for (const item of items) {
          item.value = JSON.parse(item.value);
        }

        return items;
      });
  },

  // Promise<number> is the number of row deleted
  // it seems .returning is not supported for knex with sqlite,
  // so we cannot return the row deleted
  delete(key: string): Promise<number> {
    return KeyValueStore()
      .where('key', key)
      .delete();
  },

  clear(): Promise<void> {
    return KeyValueStore().truncate()
  },
}
