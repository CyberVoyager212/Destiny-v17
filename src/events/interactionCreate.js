const {
  MessageActionRow,
  MessageButton,
  MessageEmbed,
  Permissions,
} = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

module.exports = async (client, interaction) => {
  if (!interaction.isButton()) return;

  const { customId, user, channel, guild } = interaction;
  const member = await guild.members.fetch(user.id).catch(() => null);
  if (!member) return;

  // --------------------- 🎟 Ticket Sistem ---------------------
  const ticketOwnerId = await db.get(`ticket_channel_${channel.id}`);
  if (ticketOwnerId) {
    const isOwner = user.id === ticketOwnerId;
    const isStaff = member.permissions.has(Permissions.FLAGS.MANAGE_CHANNELS);

    if (customId === 'ticket_close') {
      if (!isOwner && !isStaff) {
        return interaction.reply({
          content: '🚫 *Bu kapıyı kapatmaya yetkin yok, kahraman!*',
          ephemeral: true,
        });
      }
      if (isOwner && !isStaff) {
        await channel.permissionOverwrites.edit(ticketOwnerId, {
          VIEW_CHANNEL: false,
        });
        return interaction.reply({
          content: '🔒 *Biletini kapattın, artık göremiyorsun...*',
          ephemeral: true,
        });
      }
      if (isStaff) {
        await interaction.deferReply({ ephemeral: true });
        let archiveCat = guild.channels.cache.find(
          (c) => c.name === 'ticket-arsiv' && c.type === 'GUILD_CATEGORY'
        );
        if (!archiveCat) {
          archiveCat = await guild.channels.create('ticket-arsiv', {
            type: 'GUILD_CATEGORY',
          });
        }
        const msgs = await channel.messages.fetch({ limit: 100 });
        const content = msgs
          .map(
            (m) =>
              `[${new Date(m.createdTimestamp).toLocaleString()}] ${
                m.author.tag
              }: ${m.content}`
          )
          .reverse()
          .join('\n');
        let arcName = `${channel.name}-arsiv`,
          idx = 1;
        while (guild.channels.cache.find((c) => c.name === arcName)) {
          idx++;
          arcName = `${channel.name}-arsiv-${idx}`;
        }
        const arcChannel = await guild.channels.create(arcName, {
          type: 'GUILD_TEXT',
          parent: archiveCat.id,
          permissionOverwrites: [
            {
              id: guild.roles.everyone.id,
              deny: [Permissions.FLAGS.VIEW_CHANNEL],
            },
            {
              id: member.roles.highest.id,
              allow: [Permissions.FLAGS.VIEW_CHANNEL],
            },
          ],
        });
        if (content.length > 2000) {
          for (let i = 0; i < content.length; i += 1990) {
            await arcChannel.send('```' + content.slice(i, i + 1990) + '```');
          }
        } else {
          await arcChannel.send('```' + content + '```');
        }
        await db.delete(`ticket_user_${ticketOwnerId}`);
        await db.delete(`ticket_channel_${channel.id}`);
        await channel.delete().catch(() => {});
      }
    }

    if (customId === 'ticket_adduser') {
      if (!isStaff) {
        return interaction.reply({
          content: '⚔️ *Buna gücün yetmiyor, sensei...*',
          ephemeral: true,
        });
      }
      await interaction.reply({
        content: '📝 *Eklenecek kişinin **ID**’sini yaz bakalım (60 saniye).*',
        ephemeral: true,
      });
      const filter = (m) => m.author.id === user.id;
      const collector = channel.createMessageCollector({
        filter,
        max: 1,
        time: 60000,
      });

      collector.on('collect', async (msg) => {
        const input = msg.content.trim();
        if (!/^\d{17,19}$/.test(input)) {
          await channel.send({
            content: '❌ *Yanlış ID girdin, kahraman adayı!*',
          });
          msg.delete().catch(() => {});
          return;
        }
        collector.stop('ok');
        msg.delete().catch(() => {});

        let target;
        try {
          target = await guild.members.fetch(input);
        } catch {
          target = null;
        }
        if (!target) {
          return channel.send({
            content: '❌ *Böyle bir kullanıcı bu evrende yok...*',
          });
        }

        await channel.permissionOverwrites.edit(target.id, {
          VIEW_CHANNEL: true,
          SEND_MESSAGES: true,
        });

        channel.send({
          content: `🌟 **${target.user.tag}** aramıza katıldı!`,
        });
      });

      collector.on('end', (collected, reason) => {
        if (reason !== 'ok') {
          interaction.followUp({
            content: '⌛ *Zaman doldu, fırsat kaçtı...*',
            ephemeral: true,
          });
        }
      });
    }
  }

  // --------------------- 🔊 PrivateSes Sistem ---------------------
  if (customId.startsWith('ps_')) {
    const listKey = `privateses_list_${guild.id}`;
    const list = (await db.get(listKey)) || [];
    const [prefix, action, voiceId] = customId.split('_');
    const meta = list.find((x) => x.voiceId === voiceId);
    if (!meta) {
      return interaction.reply({
        content: '💤 *Bu oda artık yok...*',
        ephemeral: true,
      });
    }
    const voiceChannel = guild.channels.cache.get(meta.voiceId);
    if (!voiceChannel) {
      return interaction.reply({
        content: '💤 *Bu oda kaybolmuş...*',
        ephemeral: true,
      });
    }
    if (user.id !== meta.ownerId) {
      return interaction.reply({
        content: '🚫 *Bu oda sana ait değil, kahraman!*',
        ephemeral: true,
      });
    }

    if (action === 'rename') {
      await interaction.reply({
        content: '✏️ *Yeni oda adını yaz (60 saniye içinde).*',
        ephemeral: true,
      });
      const filter = (m) => m.author.id === user.id;
      const collector = channel.createMessageCollector({
        filter,
        max: 1,
        time: 60000,
      });
      collector.on('collect', async (msg) => {
        const newName = msg.content.trim().slice(0, 90);
        await voiceChannel.setName(newName);
        await interaction.followUp({
          content: `✅ *Odanın adı değişti → **${newName}***`,
          ephemeral: true,
        });
        msg.delete().catch(() => {});
      });
    }

    if (action === 'lock') {
      const listKey = `privateses_list_${guild.id}`;
      const metaList = (await client.db.get(listKey)) || [];
      const meta = metaList.find((x) => x.voiceId === voiceId);

      if (!meta) {
        return interaction.reply({
          content: '❌ Bu oda kayıtlarda bulunamadı.',
          ephemeral: true,
        });
      }
      if (meta.ownerId !== interaction.user.id) {
        return interaction.reply({
          content: '❌ Sadece oda sahibi bu işlemi yapabilir.',
          ephemeral: true,
        });
      }

      meta.locked = !meta.locked;
      const updated = metaList.map((x) =>
        x.voiceId === meta.voiceId ? meta : x
      );
      await client.db.set(listKey, updated);

      if (meta.locked) {
        await voiceChannel.permissionOverwrites.edit(guild.roles.everyone.id, {
          VIEW_CHANNEL: false,
          CONNECT: false,
        });
        await interaction.reply({
          content: '🔒 Oda kilitlendi. Artık kimse göremiyor ve giremiyor.',
          ephemeral: true,
        });
      } else {
        await voiceChannel.permissionOverwrites.edit(guild.roles.everyone.id, {
          VIEW_CHANNEL: true,
          CONNECT: true,
        });
        await interaction.reply({
          content: '🔓 Oda açıldı. Herkes görebilir ve bağlanabilir.',
          ephemeral: true,
        });
      }
    }

    if (action === 'invite') {
      await interaction.reply({
        content:
          '👥 *Davet etmek istediğin kullanıcının **ID**’sini yaz (60s).*',
        ephemeral: true,
      });
      const filter = (m) => m.author.id === user.id;
      const collector = channel.createMessageCollector({
        filter,
        max: 1,
        time: 60000,
      });
      collector.on('collect', async (msg) => {
        const input = msg.content.trim();
        let target;
        try {
          target = await guild.members.fetch(input);
        } catch {
          target = null;
        }
        if (!target) {
          return channel.send('❌ *Bu kullanıcı bulunamadı.*');
        }
        await voiceChannel.permissionOverwrites.edit(target.id, {
          CONNECT: true,
          VIEW_CHANNEL: true,
        });
        channel.send(`🌸 **${target.user.tag}** davet edildi!`);
        msg.delete().catch(() => {});
      });
    }

    if (action === 'delete') {
      await interaction.reply({
        content: '💣 *Odan yok ediliyor...*',
        ephemeral: true,
      });
      try {
        await voiceChannel.delete();
      } catch {}
      try {
        const textChannel = guild.channels.cache.get(meta.textId);
        if (textChannel) await textChannel.delete();
      } catch {}
      const newList = list.filter((x) => x.voiceId !== meta.voiceId);
      await db.set(listKey, newList);
    }
  }
  // --------------------- 🎭 Buton Rol Sistemi ---------------------
  if (customId.startsWith('butonrol_')) {
    const roleId = customId.split('_')[1];
    const role = guild.roles.cache.get(roleId);
    if (!role) {
      return interaction.reply({
        content: '❌ Bu rol artık yok.',
        ephemeral: true,
      });
    }

    if (member.roles.cache.has(roleId)) {
      await member.roles.remove(roleId);
      return interaction.reply({
        content: `➖ <@&${roleId}> rolün alındı.`,
        ephemeral: true,
      });
    } else {
      await member.roles.add(roleId);
      return interaction.reply({
        content: `➕ <@&${roleId}> rolün verildi.`,
        ephemeral: true,
      });
    }
  }
};
