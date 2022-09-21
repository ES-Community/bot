import type { Knex } from "knex";
import fs from "fs/promises";
import { config, DB, KeyValue, KeyValueStore, SearchFlag } from "#src/database";

beforeAll(async () => {
  await fs.rm((config.connection as Knex.Sqlite3ConnectionConfig).filename, {force: true});
  await DB.migrate.latest();
});

afterAll(async () => {
  await DB.destroy();
})

describe('Check emptiness', () => {
  test('KeyValue.length() === 0', async () => {
    expect(await KeyValue.size()).toBe(0);
  });

  test('KeyValue.keys() === []', async () => {
    expect(await KeyValue.keys()).toEqual([]);
  });

  test('KeyValue.values() === []', async () => {
    expect(await KeyValue.values()).toEqual([]);
  });

  test('KeyValue.entries() === []', async () => {
    expect(await KeyValue.entries()).toEqual([]);
  });

  test('KeyValue.all() === []', async () => {
    expect(await KeyValue.all()).toEqual([]);
  });

  test('KeyValue.has("donotexistkey") === false', async () => {
    expect(await KeyValue.has("donotexistkey")).toBe(false);
  });

  test('KeyValue.get("donotexistkey") === undefined', async () => {
    expect(await KeyValue.get("donotexistkey")).toBe(undefined);
  });

  test('KeyValue.search("key") === []', async () => {
    expect(await KeyValue.search("key")).toEqual([]);
  })
});

describe('Check insertion', () => {
  afterEach(async () => {
    await KeyValueStore().truncate();
  });

  //
  // check if add new row
  //

  test('KeyValue.set("key", "value") === 1', async () => {
    const rowInserted = await KeyValue.set("key", "value");
    expect(rowInserted).toBe(1);
  });

  test('KeyValue.has("key") === true', async () => {
    await KeyValue.set("key", "value");
    expect(await KeyValue.has('key')).toBe(true);
  });

  test('KeyValue.set("key", "value-b") === 1, when key already exist', async () => {
    await KeyValue.set("key", "value-a");
    const rowInserted = await KeyValue.set("key", "value-b");

    expect(rowInserted).toBe(1);
  });

  test('KeyValue.set("key-2", "value-b") === 2, when key already exist', async () => {
    await KeyValue.set("key-1", "value");
    await KeyValue.set("key-2", "value");
    const rowInserted = await KeyValue.set("key-2", "value-b");

    expect(rowInserted).toBe(2);
  });

  //
  // Check if value inserted is correct
  //

  test('KeyValue.get("key") === "value"', async () => {
    await KeyValue.set("key", "value");

    expect(await KeyValue.get("key")).toBe("value");
  });

  test('KeyValue.get("key") === "value-overrided"', async () => {
    await KeyValue.set("key", "value");
    await KeyValue.set("key", "value-overrided");

    expect(await KeyValue.get("key")).toBe("value-overrided");
  });
});

describe('Check complex value insertion and restitution', () => {
  afterEach(async () => {
    await KeyValueStore().truncate();
  });

  //
  // Scalar types
  //

  test('boolean value', async () => {
    await KeyValue.set("true", true);
    await KeyValue.set("false", false);

    expect(await KeyValue.get("true")).toBe(true);
    expect(await KeyValue.get("false")).toBe(false);
  });

  test('number value', async () => {
    await KeyValue.set("100", 100);
    await KeyValue.set("-254", -254);

    expect(await KeyValue.get("100")).toBe(100);
    expect(await KeyValue.get("-254")).toBe(-254);
  });

  test('string value', async () => {
    await KeyValue.set("string", 'string');

    expect(await KeyValue.get("string")).toBe('string');
  });

  test('null value', async () => {
    await KeyValue.set("null", null);

    expect(await KeyValue.get("null")).toBe(null);
  });

  //
  // Objects types
  //

  const SIMPLE_OBJECT = {
    toto: "tata",
  };
  const COMPLEX_OBJECT = {
    boolean: true,
    number: 1,
    string: 'string',
    null: null,
    array: [1, 2, 3],
  };
  const NESTED_OBJECT = {
    level1: {
      level2: {
        ...COMPLEX_OBJECT,
      },
    },
  };

  test('simple objects value', async () => {
    await KeyValue.set(`SIMPLE_OBJECT`, SIMPLE_OBJECT);

    expect(await KeyValue.get(`SIMPLE_OBJECT`)).toEqual(SIMPLE_OBJECT);
  });

  test('complex objects value', async () => {
    await KeyValue.set(`COMPLEX_OBJECT`, COMPLEX_OBJECT);

    expect(await KeyValue.get(`COMPLEX_OBJECT`)).toEqual(COMPLEX_OBJECT);
  });

  test('complex objects value', async () => {
    await KeyValue.set(`NESTED_OBJECT`, NESTED_OBJECT);

    expect(await KeyValue.get(`NESTED_OBJECT`)).toEqual(NESTED_OBJECT);
  });

  //
  // Array Types
  //

  const SIMPLE_ARRAY = [1, 2, 3];
  const COMPLEX_ARRAY = [true, false, 1, 'string', null, {...NESTED_OBJECT}];
  const NESTED_ARRAY = [1, [...SIMPLE_ARRAY], [[...COMPLEX_ARRAY]]];

  test('simple array value', async () => {
    await KeyValue.set(`SIMPLE_ARRAY`, SIMPLE_ARRAY);

    expect(await KeyValue.get(`SIMPLE_ARRAY`)).toEqual(SIMPLE_ARRAY);
  });

  test('complex array value', async () => {
    await KeyValue.set(`COMPLEX_ARRAY`, COMPLEX_ARRAY);

    expect(await KeyValue.get(`COMPLEX_ARRAY`)).toEqual(COMPLEX_ARRAY);
  });

  test('complex array value', async () => {
    await KeyValue.set(`NESTED_ARRAY`, NESTED_ARRAY);

    expect(await KeyValue.get(`NESTED_ARRAY`)).toEqual(NESTED_ARRAY);
  });
});

describe('check getters when not empty', () => {
  beforeAll(async () => {
    await KeyValue.set('key', 'value');
    await KeyValue.set('last-epic-slugs', ['spirit-of-the-north-f58a66', 'the-captain']);
    await KeyValue.set('last-gog-slug', 'tales_of_monkey_island');
  });

  afterAll(async () => {
    await KeyValueStore().truncate();
  });

  test('.length() === 3', async () => {
    expect(await KeyValue.size()).toBe(3);
  });

  test('.keys()', async () => {
    expect(await KeyValue.keys()).toEqual(['key', 'last-epic-slugs', 'last-gog-slug']);
  });

  test('.values()', async () => {
    expect(await KeyValue.values()).toEqual(['value', ['spirit-of-the-north-f58a66', 'the-captain'], 'tales_of_monkey_island']);
  });

  test('.entries()', async () => {
    expect(await KeyValue.entries()).toEqual([
      ['key', 'value'],
      ['last-epic-slugs', ['spirit-of-the-north-f58a66', 'the-captain']],
      ['last-gog-slug', 'tales_of_monkey_island'],
    ]);
  });

  test('.all()', async () => {
    expect(await KeyValue.all()).toEqual([
      {key: 'key', value: 'value'},
      {key: 'last-epic-slugs', value: ['spirit-of-the-north-f58a66', 'the-captain']},
      {key: 'last-gog-slug', value: 'tales_of_monkey_island'},
    ]);
  });

  test('.has()', async () => {
    expect(await KeyValue.has("key")).toBe(true);
    expect(await KeyValue.has("last-epic-slugs")).toBe(true);
    expect(await KeyValue.has("last-gog-slug")).toBe(true);
  });

  test('.search("LAST", SearchFlag.StartsWith)', async () => {
    expect(await KeyValue.search('LAST', SearchFlag.StartsWith)).toEqual([
      {key: 'last-epic-slugs', value: ['spirit-of-the-north-f58a66', 'the-captain']},
      {key: 'last-gog-slug', value: 'tales_of_monkey_island'},
    ]);
  });

  test('.search("slug", SearchFlag.EndsWith)', async () => {
    expect(await KeyValue.search('slug', SearchFlag.EndsWith)).toEqual([
      {key: 'last-gog-slug', value: 'tales_of_monkey_island'},
    ]);
  });

  test('.search("kEy")', async () => {
    await KeyValue.set('LastKeyInserted', 'zbadurg');
    await KeyValue.set('RandomK', Math.random() * 100);
    await KeyValue.set('keywords', ['last', 'slug']);

    expect(await KeyValue.search('kEy')).toEqual([
      {key: 'key', value: 'value'},
      {key: 'LastKeyInserted', value: 'zbadurg'},
      {key: 'keywords', value: ['last', 'slug']},
    ]);
  });
  
  test('.search exact', async () => {
    await KeyValue.set('test-exact-key', 100);
    await KeyValue.set('-test-exact-key-', 50);
    
    expect(await KeyValue.search('test-exact-key', SearchFlag.Exact)).toEqual([{key: 'test-exact-key', value: 100}]);
    expect(await KeyValue.search('Test-Exact-Key', SearchFlag.Exact)).toEqual([{key: 'test-exact-key', value: 100}]);
  });

  test('.search with escaping', async () => {
    await KeyValue.set('50% of 100', 50);
    await KeyValue.set('_underlined_', '# title');

    expect(await KeyValue.search('% of')).toEqual([{key: '50% of 100', value: 50}]);
    expect(await KeyValue.search('ed_', SearchFlag.EndsWith)).toEqual([{key: '_underlined_', value: '# title'}]);
    expect(await KeyValue.search('50%', SearchFlag.StartsWith)).toEqual([{key: '50% of 100', value: 50}]);
    expect(await KeyValue.search('% of 100', SearchFlag.EndsWith)).toEqual([{key: '50% of 100', value: 50}]);
    expect(await KeyValue.search('50% of 100', SearchFlag.Exact)).toEqual([{key: '50% of 100', value: 50}]);
  });
});

describe('check dropping', () => {
  beforeEach(async () => {
    await KeyValue.set('key', 'value');
    await KeyValue.set('last-epic-slugs', ['spirit-of-the-north-f58a66', 'the-captain']);
    await KeyValue.set('last-gog-slug', 'tales_of_monkey_island');
  });

  afterEach(async () => {
    await KeyValueStore().truncate();
  });

  test('.drop() inexistant key', async () => {
    expect(await KeyValue.delete("inexistant")).toBe(0);
  });

  test('.drop() existent key', async () => {
    expect(await KeyValue.delete("key")).toEqual(1);
    expect(await KeyValue.size()).toBe(2);
  });

  test('.drop() existent key with json', async () => {
    expect(await KeyValue.delete("last-epic-slugs")).toEqual(1);
    expect(await KeyValue.size()).toBe(2);
  });

  test('.dropAll', async () => {
    await KeyValue.clear();
    expect(await KeyValue.size()).toBe(0);
  });
})
