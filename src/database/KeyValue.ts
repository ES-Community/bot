import DB from "./db";

type JSONScalar = boolean | number | string | null;
type JSONKey = string | number;
type JSONArray = (JSONScalar | JSONArray | JSONObject)[];
type JSONObjectRecursive<A extends Record<JSONKey, JSONScalar | JSONArray>> = A | Record<JSONKey, A>;
type JSONObject = JSONObjectRecursive<Record<JSONKey, JSONScalar | JSONArray>>
type JSONTypes = JSONScalar | JSONArray | JSONObject;

export interface IKeyValue {
  key: string;
  value: Record<string | number, JSONTypes>;
}

export const KeyValueStore = () => DB('kv');

export const KeyValue = {
  get length(): Promise<number> {
    return KeyValueStore().count('key').pluck('key')
      .then(results => results[0]);
  }
}