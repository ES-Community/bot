import 'make-promises-safe';
import { Client } from 'discord.js';
import * as Dotenv from 'dotenv';

Dotenv.config();

const client = new Client();

client.on('ready', () => {
  console.log('Bot is ready');
});

client.login(process.env.DISCORD_TOKEN);
