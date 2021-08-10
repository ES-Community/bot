/* eslint-disable @typescript-eslint/no-var-requires */

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

// emoji-regex, TypeScript and ESM do not like each other.
export default require('emoji-regex/text')() as RegExp;
