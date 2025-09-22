const { MessageActionRow, MessageButton, MessageEmbed } = require('discord.js');
const { joinVoiceChannel, getVoiceConnection } = require('@discordjs/voice');

module.exports = async (client, oldState, newState) => {
  try {
    if (newState.member && newState.member.id === client.user.id) {
      if (oldState.channelId && !newState.channelId) {
        const guild = oldState.guild;
        const dbKey = `autoVC_${guild.id}`;
        const channelId = await client.db.get(dbKey);
        if (channelId) {
          const channel = guild.channels.cache.get(channelId);
          if (channel) {
            const existing = getVoiceConnection(guild.id);
            if (existing) existing.destroy();
            try {
              joinVoiceChannel({
                channelId: channel.id,
                guildId: guild.id,
                adapterCreator: guild.voiceAdapterCreator,
              });
            } catch (err) {
              console.error(
                `[AutoVC] Yeniden katılamadı: ${guild.name}/${channel.name}`,
                err
              );
            }
          }
        }
      }
      return;
    }
    const guild = newState.guild || oldState.guild;
    if (!guild) return;

    const cfg = await client.db.get(`privateses_${guild.id}`);
    if (!cfg) return;

    const hubId = cfg.hubId;
    const listKey = `privateses_list_${guild.id}`;

    if (newState.channelId === hubId && oldState.channelId !== hubId) {
      const member = newState.member;
      if (!member) return;

      let parent = null;
      if (cfg.categoryId)
        parent = guild.channels.cache.get(cfg.categoryId) || null;

      const voiceOverwrites = [
        { id: guild.roles.everyone.id, deny: ['VIEW_CHANNEL', 'CONNECT'] },
        {
          id: member.id,
          allow: ['VIEW_CHANNEL', 'CONNECT', 'SPEAK', 'MANAGE_CHANNELS'],
        },
        {
          id: client.user.id,
          allow: ['VIEW_CHANNEL', 'CONNECT', 'SPEAK', 'MANAGE_CHANNELS'],
        },
      ];

      const textOverwrites = [
        { id: guild.roles.everyone.id, deny: ['VIEW_CHANNEL'] },
        {
          id: member.id,
          allow: [
            'VIEW_CHANNEL',
            'SEND_MESSAGES',
            'EMBED_LINKS',
            'READ_MESSAGE_HISTORY',
          ],
        },
        {
          id: client.user.id,
          allow: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'EMBED_LINKS'],
        },
      ];

      const safeName = `${member.user.username}`
        .slice(0, 90)
        .replace(/[^a-zA-Z0-9-\u00C0-\u017F_ ]/g, '');
      let voiceChannel;
      try {
        voiceChannel = await guild.channels.create(
          safeName || `özel-${member.id}`,
          {
            type: 'GUILD_VOICE',
            parent: parent ? parent.id : undefined,
            permissionOverwrites: voiceOverwrites,
            reason: `Özel ses kanalı: ${member.user.tag} için oluşturuldu.`,
          }
        );
      } catch (e) {
        console.error('Özel voice kanal oluşturulamadı:', e);
        return;
      }

      let textChannel;
      try {
        const textName =
          `vc-kontrol-${member.user.username}`
            .slice(0, 90)
            .replace(/[^a-zA-Z0-9-\u00C0-\u017F_ ]/g, '') ||
          `vc-kontrol-${member.id}`;
        textChannel = await guild.channels.create(textName, {
          type: 'GUILD_TEXT',
          parent: parent ? parent.id : undefined,
          permissionOverwrites: textOverwrites,
          reason: 'Özel voice kontrol kanalı',
        });
      } catch (e) {
        console.error('Kontrol text kanalı oluşturulamadı:', e);
        try {
          await voiceChannel.delete(
            'Kontrol kanalı oluşturulamadığı için geri siliniyor'
          );
        } catch {}
        return;
      }

      const list = (await client.db.get(listKey)) || [];
      list.push({
        voiceId: voiceChannel.id,
        textId: textChannel.id,
        ownerId: member.id,
        createdAt: Date.now(),
        locked: false,
      });
      await client.db.set(listKey, list);

      try {
        await member.voice.setChannel(voiceChannel.id);
      } catch (e) {
        console.warn('Kullanıcı taşıma başarısız:', e.message);
      }

      const embed = new MessageEmbed()
        .setTitle('Özel Oda Kontrol Paneli')
        .setDescription(
          `Oda: **${voiceChannel.name}**\nSahip: <@${member.id}>\n\nButonlara bastığında odanı yönetebilirsin.`
        )
        .setColor('#5865F2')
        .setTimestamp();

      const row = new MessageActionRow().addComponents(
        new MessageButton()
          .setCustomId(`ps_rename_${voiceChannel.id}`)
          .setLabel('İsmi Değiştir')
          .setStyle('PRIMARY'),
        new MessageButton()
          .setCustomId(`ps_lock_${voiceChannel.id}`)
          .setLabel('Kilitle/Aç')
          .setStyle('SECONDARY'),
        new MessageButton()
          .setCustomId(`ps_invite_${voiceChannel.id}`)
          .setLabel('Kişi Ekle')
          .setStyle('SUCCESS'),
        new MessageButton()
          .setCustomId(`ps_delete_${voiceChannel.id}`)
          .setLabel('Odayı Sil')
          .setStyle('DANGER')
      );

      try {
        await textChannel.send({ embeds: [embed], components: [row] });
      } catch (e) {
        console.error('Kontrol mesajı gönderilemedi:', e);
      }

      return;
    }

    if (oldState.channelId) {
      const metaList = (await client.db.get(listKey)) || [];
      const meta = metaList.find((x) => x.voiceId === oldState.channelId);
      if (meta) {
        const vch = guild.channels.cache.get(meta.voiceId);
        if (vch && vch.members.size === 0) {
          setTimeout(async () => {
            const vch2 = guild.channels.cache.get(meta.voiceId);
            if (!vch2) {
              const filtered = (await client.db.get(listKey)) || [];
              await client.db.set(
                listKey,
                filtered.filter((x) => x.voiceId !== meta.voiceId)
              );
              return;
            }
            if (vch2.members.size === 0) {
              try {
                await vch2.delete('Özel kanal boşaldığı için temizlendi.');
              } catch (e) {}
              try {
                const t = guild.channels.cache.get(meta.textId);
                if (t)
                  await t.delete(
                    'Özel kontrol kanalı - sahibin odası boşaldığı için temizlendi.'
                  );
              } catch (e) {}
              const filtered = (await client.db.get(listKey)) || [];
              await client.db.set(
                listKey,
                filtered.filter((x) => x.voiceId !== meta.voiceId)
              );
            }
          }, 5 * 1000);
        }
      }
    }
  } catch (e) {
    console.error('voiceStateUpdate handler error:', e);
  }
};
