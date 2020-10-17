import * as Dotenv from 'dotenv';

Dotenv.config();

console.log('Started bot');

setInterval(() => {
  console.log('Hello world');
}, 10 * 1000);
