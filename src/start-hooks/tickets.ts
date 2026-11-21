import { StartHook, type StartHookContext } from '../framework/StartHook.ts';
import { findTextChannelByName } from '../framework/index.ts';
import {
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  SectionBuilder,
  SnowflakeUtil,
  ChannelType,
  OverwriteType,
} from 'discord.js';
import type { TextChannel, CategoryChannel, Guild, User } from 'discord.js';
import assert from 'node:assert';
import { Tickets } from '../database/Ticket.ts';

export default new StartHook({
  name: 'Tickets',
  description: 'Setup the ticketing system',
  enabled: true,
  handle: onStart,
});

async function onStart(context: StartHookContext) {
  const { client } = context;

  await ensureBotMessageExists(context);

  client.on('interactionCreate', (interaction) => {
    asyncExecutor(context, async () => {
      if (!(
        interaction.applicationId === client.application?.id &&
        interaction.isButton() &&
        interaction.customId === 'open-ticket' &&
        interaction.channel?.type === ChannelType.GuildText &&
        interaction.channel.parent &&
        interaction.guild
      )) {
        return;
      }

      const { user, channel, guild } = interaction;
      const { parent: category } = interaction.channel;
      await onCreateTicket(context, { user, channel, category, guild });
    });
  });

  client.on('interactionCreate', (interaction) => {
    asyncExecutor(context, async () => {
      if (!(
        interaction.applicationId === client.application?.id &&
        interaction.isButton() &&
        interaction.customId === 'close-ticket' &&
        interaction.channel?.type === ChannelType.GuildText &&
        interaction.channel.parent &&
        interaction.guild
      )) {
        return;
      }

      const { user, channel, guild } = interaction;
      const { parent: category } = interaction.channel;
      await onCloseTicket(context, { user, channel, category, guild });

      await interaction.reply(
        "Le ticket a été cloturé et déplacé dans l'archive",
      );
    });
  });

  return onStop;
}

async function onStop(context: StartHookContext) {
  void context;
}

async function ensureBotMessageExists(context: StartHookContext) {
  const channel = findTextChannelByName(
    context.client.channels,
    'ouvrir-un-ticket',
  );
  const messages = await channel.messages.fetch({ limit: 1 });
  if (messages.size > 0) return;

  const openTicket = new ButtonBuilder()
    .setCustomId('open-ticket')
    .setLabel('Ouvrir un nouveau ticket')
    .setStyle(ButtonStyle.Primary);
  const section = new SectionBuilder()
    .addTextDisplayComponents(
      (text) => text.setContent('# Contact modération'),
      (text) =>
        text.setContent('Pour ouvrir un ticket, cliquez sur le bouton.'),
    )
    .setButtonAccessory(openTicket);

  await channel.send({
    components: [section],
    flags: MessageFlags.IsComponentsV2,
    enforceNonce: true,
    nonce: SnowflakeUtil.generate().toString(),
  });
}

function asyncExecutor(
  context: StartHookContext,
  function_: () => Promise<void>,
) {
  function_().catch(async (error: Error) => {
    context.logger.error(error);

    const logs = findTextChannelByName(context.client.channels, 'logs');
    const Codeblocks = '```';
    void logs.send({
      content: `${error.message}\n${Codeblocks}${error.stack}${Codeblocks}\n\nLoggerId: ${context.logger.bindings().id}`,
      enforceNonce: true,
      nonce: SnowflakeUtil.generate().toString(),
    });
  });
}

async function onCreateTicket(
  context: StartHookContext,
  interaction: {
    user: User;
    channel: TextChannel;
    category: CategoryChannel;
    guild: Guild;
  },
) {
  const guild = interaction.guild;
  const category = interaction.channel.parent;
  const modoRole = guild.roles.cache.find((r) => r.name === 'Modo');
  const communityRole = guild.roles.cache.find(
    (role) => role.name === 'Communauté',
  );
  assert.ok(modoRole);
  assert.ok(communityRole);

  const id = await Tickets.create();
  const newTicket = await guild.channels.create({
    name: `ticket-${id}`,
    parent: category,
    type: ChannelType.GuildText,
    permissionOverwrites: [
      {
        type: OverwriteType.Role,
        id: guild.roles.everyone.id,
        deny: ['ViewChannel', 'ReadMessageHistory', 'SendMessages'],
      },
      {
        type: OverwriteType.Role,
        id: communityRole.id,
        deny: ['ViewChannel', 'ReadMessageHistory', 'SendMessages'],
      },
      {
        type: OverwriteType.Role,
        id: modoRole.id,
        allow: [
          'ViewChannel',
          'ReadMessageHistory',
          'ManageMessages',
          'SendMessages',
        ],
      },
      {
        type: OverwriteType.Member,
        id: interaction.user.id,
        allow: ['ViewChannel', 'ReadMessageHistory', 'SendMessages'],
      },
    ],
  });

  const openTicket = new ButtonBuilder()
    .setCustomId('close-ticket')
    .setLabel('Clôturer ce ticket')
    .setStyle(ButtonStyle.Primary);
  const section = new SectionBuilder()
    .addTextDisplayComponents((text) =>
      text.setContent('Pour clore le ticket, cliquez sur le bouton.'),
    )
    .setButtonAccessory(openTicket);

  const welcomeMessage = await newTicket.send({
    components: [section],
    flags: MessageFlags.IsComponentsV2,
    enforceNonce: true,
    nonce: SnowflakeUtil.generate().toString(),
  });
  await welcomeMessage.pin();
}

async function onCloseTicket(
  context: StartHookContext,
  interaction: {
    user: User;
    channel: TextChannel;
    category: CategoryChannel;
    guild: Guild;
  },
) {
  const archiveCategory = interaction.guild.channels.cache.find(
    (channel) => channel.name === 'Archive Tickets',
  );
  assert.ok(archiveCategory?.type === ChannelType.GuildCategory);
  await interaction.channel.setParent(archiveCategory);
  await interaction.channel.permissionOverwrites.edit(interaction.user, {
    SendMessages: false,
  });

  const _ticketId = interaction.channel.name.split('-', 2).at(-1);
  assert.ok(_ticketId);
  const ticketId = Number(_ticketId);
  assert.ok(!Number.isNaN(ticketId));

  await Tickets.close(ticketId);
}
