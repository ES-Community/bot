import Bot from '#src/framework/Bot';

const dummyOptions = { token: 'dummy' };

test('bot.start() throws if called with bad token', async () => {
  const bot = new Bot(dummyOptions);
  await expect(bot.start()).rejects.toThrow(/invalid token/);
});

test('bot.start() throws if called twice', async () => {
  const bot = new Bot(dummyOptions);
  bot.start().catch(() => {
    // ignore
  });
  await expect(bot.start()).rejects.toThrow(/can only be started once/);
});

test('bot.stop() throws if it was not started', () => {
  const bot = new Bot(dummyOptions);
  expect(() => bot.stop()).toThrow(/was not started/);
});
