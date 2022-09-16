import DB from "./db";

type JSONScalar = boolean | number | string | null;
type JSONKey = string | number;
type JSONArray = (JSONScalar | JSONArray | JSONObject)[];
type JSONObjectRecursive<A extends Record<JSONKey, JSONScalar | JSONArray>> = A | Record<JSONKey, A>;
type JSONObject = JSONObjectRecursive<Record<JSONKey, JSONScalar | JSONArray>>
type JSONTypes = JSONScalar | JSONArray | JSONObject;

export interface IKeyValue {
  key: string;
  value: JSONTypes;
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const KeyValueStore = <U = never>() => DB<U>('kv');

export const KeyValue = {
  length(): Promise<number> {
    return KeyValueStore<number>()
      .count('key')
      .pluck('key')
      .first();
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
      .then(entries => entries.map((kv) => [kv.key, kv.value]));
  },
  
  all(): Promise<Iterable<IKeyValue>> {
    return KeyValueStore<Iterable<IKeyValue>>()
      .select('key', 'value');
  },
  
  async get(key: string): Promise<JSONTypes> {
    const value = await KeyValueStore<string>().select('value').where('key', key).first();
    
    return JSON.parse(value);
  },
  
  async set(key: string, value: JSONTypes): Promise<number[]> {
    return KeyValueStore<IKeyValue>().insert({
      key: key,
      value: JSON.stringify(value)
    })
      .onConflict('key')
      .merge();
  }
}
