import { URL as _URL, URLSearchParams as _URLSearchParams } from 'node:url';

declare global {
  // https://github.com/DefinitelyTyped/DefinitelyTyped/issues/34960

  const URLSearchParams: typeof _URLSearchParams;
  type URLSearchParams = _URLSearchParams;

  const URL: typeof _URL;
  type URL = _URL;
}
