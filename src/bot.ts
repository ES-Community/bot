import * as Dotenv from 'dotenv';

Dotenv.config();

console.log('Started bot');

setInterval(() => {
  console.log('Hello ES Community!');
}, 10 * 1000);
