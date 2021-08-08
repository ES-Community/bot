process.env.TZ = 'Europe/Paris';

// @ts-expect-error `@types/node` doesn't define this yet.
process.setSourceMapsEnabled(true);
