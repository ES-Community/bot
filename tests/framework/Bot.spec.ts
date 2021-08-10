import { Bot } from '#src/framework';

const dummyToken = 'dummy';

test('bot.start() throws if called with bad token', async () => {
  const bot = new Bot(dummyToken);
  await expect(bot.start()).rejects.toThrow(/invalid token/);
});

test('bot.start() throws if called twice', async () => {
  const bot = new Bot(dummyToken);
  bot.start().catch(() => {
    // ignore
  });
  await expect(bot.start()).rejects.toThrow(/can only be started once/);
});

test('bot.stop() throws if it was not started', async () => {
  const bot = new Bot(dummyToken);
  await expect(bot.stop()).rejects.toThrow(/was not started/);
});

test('bot.client throws if it was not started', () => {
  const bot = new Bot(dummyToken);
  expect(() => bot.client).toThrow(/was not started/);
});
