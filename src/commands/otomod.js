const { QuickDB } = require('quick.db');
const db = new QuickDB();
const {
  MessageEmbed,
  MessageActionRow,
  MessageButton,
  MessageSelectMenu,
  MessageAttachment,
} = require('discord.js');
const emojis = require('../emoji.json');

const FEATURES = [
  'profanity',
  'antispam',
  'antiinvite',
  'antilink',
  'massmention',
  'anticaps',
  'repeated',
  'antiattachment',
  'emojiSpam',
  'minAccountAge',
];

function defaultConfig() {
  return {
    _version: 2,
    enabled: true,
    muteRoleId: null,
    features: {
      profanity: {
        enabled: true,
        words: ['sikim', 'oç', 'amk'],
        action: 'delete',
      },
      antispam: {
        enabled: true,
        messages: 5,
        interval: 7,
        action: 'mute',
        muteMinutes: 10,
      },
      antiinvite: { enabled: true, action: 'delete' },
      antilink: { enabled: false, action: 'delete' },
      massmention: { enabled: true, threshold: 5, action: 'delete' },
      anticaps: {
        enabled: true,
        thresholdPercent: 70,
        minLength: 8,
        action: 'delete',
      },
      repeated: { enabled: true, repeats: 3, action: 'delete' },
      antiattachment: { enabled: false, action: 'delete' },
      emojiSpam: { enabled: false, threshold: 10, action: 'delete' },
      minAccountAge: { enabled: false, days: 3, action: 'kick' },
    },
    ignoreRoles: [],
    ignoreChannels: [],
  };
}

function buildStatusEmbed(guild, cfg) {
  const embed = new MessageEmbed()
    .setTitle(`🔧 Otomod Ayarları — ${guild.name}`)
    .setColor(cfg.enabled ? 'GREEN' : 'DARK_RED')
    .setThumbnail(guild.iconURL({ dynamic: true }))
    .setDescription(
      cfg.enabled
        ? 'Otomod **AÇIK**. Aşağıdan özelleştirebilirsin.'
        : "Otomod **KAPALI**. 'Otomodu Aç' butonuyla etkinleştir."
    )
    .addField(
      'Sunucu Genel',
      `Durum: **${cfg.enabled ? 'Açık' : 'Kapalı'}**\nMute Rolü: ${
        cfg.muteRoleId ? `<${cfg.muteRoleId}>` : 'Ayarlı değil'
      }\nIgnore Roller: ${
        (cfg.ignoreRoles || []).length
          ? cfg.ignoreRoles.map((r) => `<${r}>`).join(', ')
          : 'yok'
      }\nIgnore Kanallar: ${
        (cfg.ignoreChannels || []).length
          ? cfg.ignoreChannels.map((c) => `<#${c}>`).join(', ')
          : 'yok'
      }`,
      false
    );

  const list = FEATURES.map((f) => {
    const feat = cfg.features[f] || {};
    const en = feat.enabled ? '✅' : '❌';
    let short = '';
    if (f === 'profanity') short = `(${(feat.words || []).length} kelime)`;
    if (f === 'antispam')
      short = `(msg:${feat.messages || '?'}/${feat.interval || '?'}s)`;
    return `• **${f}** ${en} ${short}`;
  }).join('\n');

  embed.addField('Özellikler', list || 'yok', false);
  embed.setFooter({
    text: 'Butonlarla hızlıca açıp kapatabilirsin. Değişiklikler kalıcıdır.',
  });
  return embed;
}

function makeMainComponents(cfg) {
  const toggleButton = new MessageButton()
    .setCustomId('toggle_enabled')
    .setLabel(cfg.enabled ? 'Otomodu Kapat' : 'Otomodu Aç')
    .setStyle(cfg.enabled ? 'DANGER' : 'SUCCESS');

  const featureSelect = new MessageSelectMenu()
    .setCustomId('feature_select')
    .setPlaceholder('Bir özellik seç (detaylar)')
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(
      FEATURES.map((f) => ({
        label: f,
        value: f,
        description: `Aç/Kapat veya yapılandır: ${f}`,
      }))
    );

  const profanityBtn = new MessageButton()
    .setCustomId('profanity_manage')
    .setLabel('Profanity Yönet')
    .setStyle('PRIMARY');

  const muteSetBtn = new MessageButton()
    .setCustomId('muterole_set')
    .setLabel('Mute Rolü Ayarla')
    .setStyle('SECONDARY');

  const ignoreManage = new MessageButton()
    .setCustomId('ignore_manage')
    .setLabel('Ignore Roller/Kanallar')
    .setStyle('SECONDARY');

  const exportBtn = new MessageButton()
    .setCustomId('export_config')
    .setLabel('Export JSON')
    .setStyle('SUCCESS');

  const importBtn = new MessageButton()
    .setCustomId('import_config')
    .setLabel('Import JSON')
    .setStyle('PRIMARY');

  const resetBtn = new MessageButton()
    .setCustomId('reset_confirm')
    .setLabel('Sıfırla')
    .setStyle('DANGER');

  const closeBtn = new MessageButton()
    .setCustomId('close_panel')
    .setLabel('Kapat')
    .setStyle('SECONDARY');

  const row1 = new MessageActionRow().addComponents(
    toggleButton,
    profanityBtn,
    muteSetBtn,
    ignoreManage
  );
  const row2 = new MessageActionRow().addComponents(featureSelect);
  const row3 = new MessageActionRow().addComponents(
    exportBtn,
    importBtn,
    resetBtn,
    closeBtn
  );
  return [row1, row2, row3];
}

function makeFeatureDetailComponents(feature, cfg) {
  const toggle = new MessageButton()
    .setCustomId(`feature_toggle::${feature}`)
    .setLabel(
      cfg.features[feature] && cfg.features[feature].enabled ? 'Kapat' : 'Aç'
    )
    .setStyle('PRIMARY');

  const configure = new MessageButton()
    .setCustomId(`feature_config::${feature}`)
    .setLabel('Yapılandır')
    .setStyle('SECONDARY');

  const back = new MessageButton()
    .setCustomId('back_main')
    .setLabel('Geri')
    .setStyle('SECONDARY');

  const row = new MessageActionRow().addComponents(toggle, configure, back);
  return [row];
}

exports.execute = async (client, message, args) => {
  if (!message.member.permissions.has('MANAGE_GUILD')) {
    return message.reply(
      `${emojis.bot.error} | **${message.member.displayName}**, üzgünüm ama bunu yapmak için \`Sunucuyu Yönet\` yetkisine sahip olmalısın~ >.<`
    );
  }

  const guildId = message.guild.id;
  let cfg = (await db.get(`otomod_${guildId}`)) || defaultConfig();

  const embed = buildStatusEmbed(message.guild, cfg);
  const components = makeMainComponents(cfg);

  const panelMsg = await message.channel.send({ embeds: [embed], components });

  const collector = panelMsg.createMessageComponentCollector({
    filter: (i) => i.user.id === message.author.id,
    time: 5 * 60 * 1000,
  });

  collector.on('collect', async (interaction) => {
    try {
      if (interaction.isButton && interaction.isButton()) {
        const id = interaction.customId;

        if (id === 'toggle_enabled') {
          await interaction.deferUpdate();
          cfg.enabled = !cfg.enabled;
          await db.set(`otomod_${guildId}`, cfg);
          const newEmbed = buildStatusEmbed(message.guild, cfg);
          const newComponents = makeMainComponents(cfg);
          await panelMsg.edit({
            embeds: [newEmbed],
            components: newComponents,
          });
          return;
        }

        if (id === 'close_panel') {
          await interaction.deferUpdate();
          await panelMsg.edit({
            content: `${emojis.bot.succes} | Panel kapatıldı.`,
            components: [],
          });
          collector.stop('closed');
          return;
        }

        if (id === 'reset_confirm') {
          await interaction.deferUpdate();
          const confirmYes = new MessageButton()
            .setCustomId('reset_yes')
            .setLabel('Evet, sıfırla')
            .setStyle('DANGER');
          const confirmNo = new MessageButton()
            .setCustomId('reset_no')
            .setLabel('Hayır')
            .setStyle('SECONDARY');
          const confirmRow = new MessageActionRow().addComponents(
            confirmYes,
            confirmNo
          );
          await panelMsg.edit({
            content: `${emojis.bot.error} | ⚠️ Tüm otomod ayarları sıfırlansın mı?`,
            components: [confirmRow],
            embeds: [],
          });

          const filter = (i) => i.user.id === message.author.id;
          const reply = await panelMsg
            .awaitMessageComponent({
              filter,
              componentType: 'BUTTON',
              time: 30000,
            })
            .catch(() => null);
          if (!reply) {
            const newEmbed = buildStatusEmbed(message.guild, cfg);
            const newComponents = makeMainComponents(cfg);
            await panelMsg.edit({
              content: null,
              embeds: [newEmbed],
              components: newComponents,
            });
            return;
          }
          await reply.deferUpdate();
          if (reply.customId === 'reset_yes') {
            await db.delete(`otomod_${guildId}`);
            cfg = defaultConfig();
            await db.set(`otomod_${guildId}`, cfg);
            const newEmbed = buildStatusEmbed(message.guild, cfg);
            const newComponents = makeMainComponents(cfg);
            await panelMsg.edit({
              content: `${emojis.bot.succes} | ♻️ Ayarlar sıfırlandı.`,
              embeds: [newEmbed],
              components: newComponents,
            });
            return;
          } else {
            const newEmbed = buildStatusEmbed(message.guild, cfg);
            const newComponents = makeMainComponents(cfg);
            await panelMsg.edit({
              content: null,
              embeds: [newEmbed],
              components: newComponents,
            });
            return;
          }
        }

        if (id === 'export_config') {
          await interaction.deferReply({ ephemeral: true });
          const file = new MessageAttachment(
            Buffer.from(JSON.stringify(cfg, null, 2)),
            `otomod-${message.guild.id}.json`
          );
          await interaction.followUp({
            content: `${emojis.bot.succes} | Ayar JSON'i hazır.`,
            files: [file],
            ephemeral: true,
          });
          return;
        }

        if (id === 'import_config') {
          await interaction.reply({
            ephemeral: true,
            content: `${emojis.bot.succes} | Lütfen geçerli JSON'u bu kanala gönder veya dosya ekle (30s).`,
          });
          const filter = (m) => m.author.id === message.author.id;
          const collected = await message.channel.awaitMessages({
            filter,
            max: 1,
            time: 30000,
          });
          if (!collected.size) {
            return interaction.followUp({
              content: `${emojis.bot.error} | ⏳ Zaman doldu — işlem iptal edildi, tekrar deneyin lütfen, sempai~`,
              ephemeral: true,
            });
          }
          const msg = collected.first();
          let data = null;
          try {
            if (msg.attachments.size) {
              await interaction.followUp({
                content: `${emojis.bot.error} | Dosya eklendi ama otomatik import her zaman güvenli çalışmayabilir. Eğer hata olursa JSON içeriğini kopyala-yapıştır ile gönderin, anlıyorum mı~?`,
                ephemeral: true,
              });
              return;
            } else {
              data = JSON.parse(msg.content);
            }
          } catch (err) {
            return interaction.followUp({
              content: `${emojis.bot.error} | JSON parse hatası: ${err.message} — Lütfen geçerli JSON girin, yardım istersen buradayım~`,
              ephemeral: true,
            });
          }
          if (!data || typeof data !== 'object')
            return interaction.followUp({
              content: `${emojis.bot.error} | Geçersiz JSON. Beklenen obje formatı değil — kontrol et ve tekrar dene, lütfen~`,
              ephemeral: true,
            });
          cfg = Object.assign(defaultConfig(), data);
          await db.set(`otomod_${guildId}`, cfg);
          const newEmbed = buildStatusEmbed(message.guild, cfg);
          const newComponents = makeMainComponents(cfg);
          await panelMsg.edit({
            content: `${emojis.bot.succes} | ✅ Yeni ayarlar yüklendi.`,
            embeds: [newEmbed],
            components: newComponents,
          });
          return interaction.followUp({
            content: `${emojis.bot.succes} | Import başarılı.`,
            ephemeral: true,
          });
        }

        if (id === 'ignore_manage') {
          await interaction.deferUpdate();
          const imbed = new MessageEmbed()
            .setTitle(`${emojis.bot.succes} Ignore Yönetimi`)
            .setDescription(
              'Roller veya kanallar ekle/sil. Örnek: `addrole @rol`, `removerole @rol`, `addchan #kanal`, `removechan #kanal`'
            )
            .setFooter({ text: '30s içinde komut girin.' });
          const row = new MessageActionRow().addComponents(
            new MessageButton()
              .setCustomId('ignore_example')
              .setLabel('Örnek')
              .setStyle('SECONDARY')
          );
          await panelMsg.edit({
            embeds: [imbed],
            components: [row],
            content: null,
          });

          const filter = (m) => m.author.id === message.author.id;
          const collected = await message.channel.awaitMessages({
            filter,
            max: 1,
            time: 30000,
          });
          if (!collected.size) {
            const newEmbed = buildStatusEmbed(message.guild, cfg);
            const newComponents = makeMainComponents(cfg);
            await panelMsg.edit({
              content: null,
              embeds: [newEmbed],
              components: newComponents,
            });
            return;
          }
          const resp = collected.first().content.trim();
          const [cmd, target] = resp.split(/\s+/);
          if (cmd.toLowerCase() === 'addrole') {
            const match = target && target.match(/^<@&(\d+)>$/);
            const id = match
              ? match[1]
              : target && /^\d+$/.test(target)
              ? target
              : null;
            if (!id)
              return message.channel.send(
                `${emojis.bot.error} | Geçerli rol mention veya ID gir.`
              );
            if (!message.guild.roles.cache.get(id))
              return message.channel.send(
                `${emojis.bot.error} | Rol bulunamadı. ID veya mention'ı kontrol et lütfen.`
              );
            cfg.ignoreRoles = Array.from(
              new Set([...(cfg.ignoreRoles || []), id])
            );
            await db.set(`otomod_${guildId}`, cfg);
            const newEmbed = buildStatusEmbed(message.guild, cfg);
            await panelMsg.edit({
              content: null,
              embeds: [newEmbed],
              components: makeMainComponents(cfg),
            });
            return message.channel.send(
              `${emojis.bot.succes} | Rol <@&${id}> ignore listesine eklendi.`
            );
          }
          if (cmd.toLowerCase() === 'removerole') {
            const match = target && target.match(/^<@&(\d+)>$/);
            const id = match
              ? match[1]
              : target && /^\d+$/.test(target)
              ? target
              : null;
            if (!id)
              return message.channel.send(
                `${emojis.bot.error} | Geçerli rol mention veya ID gir.`
              );
            cfg.ignoreRoles = (cfg.ignoreRoles || []).filter((r) => r !== id);
            await db.set(`otomod_${guildId}`, cfg);
            const newEmbed = buildStatusEmbed(message.guild, cfg);
            await panelMsg.edit({
              content: null,
              embeds: [newEmbed],
              components: makeMainComponents(cfg),
            });
            return message.channel.send(
              `${emojis.bot.succes} | Rol <@&${id}> ignore listesinden çıkarıldı.`
            );
          }
          if (cmd.toLowerCase() === 'addchan') {
            const match = target && target.match(/^<#(\d+)>$/);
            const id = match
              ? match[1]
              : target && /^\d+$/.test(target)
              ? target
              : null;
            if (!id)
              return message.channel.send(
                `${emojis.bot.error} | Geçerli kanal mention veya ID gir.`
              );
            if (!message.guild.channels.cache.get(id))
              return message.channel.send(
                `${emojis.bot.error} | Kanal bulunamadı. ID veya mention'ı kontrol et lütfen.`
              );
            cfg.ignoreChannels = Array.from(
              new Set([...(cfg.ignoreChannels || []), id])
            );
            await db.set(`otomod_${guildId}`, cfg);
            const newEmbed = buildStatusEmbed(message.guild, cfg);
            await panelMsg.edit({
              content: null,
              embeds: [newEmbed],
              components: makeMainComponents(cfg),
            });
            return message.channel.send(
              `${emojis.bot.succes} | Kanal <#${id}> ignore listesine eklendi.`
            );
          }
          if (cmd.toLowerCase() === 'removechan') {
            const match = target && target.match(/^<#(\d+)>$/);
            const id = match
              ? match[1]
              : target && /^\d+$/.test(target)
              ? target
              : null;
            if (!id)
              return message.channel.send(
                `${emojis.bot.error} | Geçerli kanal mention veya ID gir.`
              );
            cfg.ignoreChannels = (cfg.ignoreChannels || []).filter(
              (c) => c !== id
            );
            await db.set(`otomod_${guildId}`, cfg);
            const newEmbed = buildStatusEmbed(message.guild, cfg);
            await panelMsg.edit({
              content: null,
              embeds: [newEmbed],
              components: makeMainComponents(cfg),
            });
            return message.channel.send(
              `${emojis.bot.succes} | Kanal <#${id}> ignore listesinden çıkarıldı.`
            );
          }

          const newEmbed = buildStatusEmbed(message.guild, cfg);
          await panelMsg.edit({
            content: null,
            embeds: [newEmbed],
            components: makeMainComponents(cfg),
          });
          return message.channel.send(
            `${emojis.bot.error} | Geçersiz komut. Örnek: addrole @rol veya addchan #kanal`
          );
        }

        if (id === 'profanity_manage') {
          await interaction.reply({
            content: `${emojis.bot.succes} | Profanity yönetimi: add <kelime>, remove <kelime>, list yaz (30s).`,
            ephemeral: true,
          });
          const filter = (m) => m.author.id === message.author.id;
          const collected = await message.channel.awaitMessages({
            filter,
            max: 1,
            time: 30000,
          });
          if (!collected.size)
            return interaction.followUp({
              content: `${emojis.bot.error} | ⏳ Zaman doldu — işlem iptal edildi, tekrar deneyin lütfen~`,
              ephemeral: true,
            });
          const resp = collected.first().content.trim();
          const [sub, ...rest] = resp.split(/\s+/);
          if (sub.toLowerCase() === 'add') {
            const word = rest.join(' ');
            if (!word)
              return interaction.followUp({
                content: `${emojis.bot.error} | Eklenecek kelime bulunamadı.`,
                ephemeral: true,
              });
            cfg.features.profanity.words = cfg.features.profanity.words || [];
            cfg.features.profanity.words.push(word.toLowerCase());
            await db.set(`otomod_${guildId}`, cfg);
            const newEmbed = buildStatusEmbed(message.guild, cfg);
            await panelMsg.edit({ embeds: [newEmbed] });
            return interaction.followUp({
              content: `${emojis.bot.succes} | \`${word}\` eklendi.`,
              ephemeral: true,
            });
          } else if (
            sub.toLowerCase() === 'remove' ||
            sub.toLowerCase() === 'rm'
          ) {
            const word = rest.join(' ');
            if (!word)
              return interaction.followUp({
                content: `${emojis.bot.error} | Silinecek kelime bulunamadı.`,
                ephemeral: true,
              });
            cfg.features.profanity.words = (
              cfg.features.profanity.words || []
            ).filter((w) => w !== word.toLowerCase());
            await db.set(`otomod_${guildId}`, cfg);
            const newEmbed = buildStatusEmbed(message.guild, cfg);
            await panelMsg.edit({ embeds: [newEmbed] });
            return interaction.followUp({
              content: `${emojis.bot.succes} | 🗑️ \`${word}\` silindi.`,
              ephemeral: true,
            });
          } else if (
            sub.toLowerCase() === 'list' ||
            sub.toLowerCase() === 'liste'
          ) {
            const list =
              (cfg.features.profanity.words || []).join(', ') || 'yok';
            return interaction.followUp({
              content: `${emojis.bot.succes} | 📜 Küfür listesi: ${list}`,
              ephemeral: true,
            });
          } else {
            return interaction.followUp({
              content: `${emojis.bot.error} | ❌ Geçersiz işlem. Lütfen add/remove/list formatında belirtin, anlaştık mı~?`,
              ephemeral: true,
            });
          }
        }

        if (id === 'muterole_set') {
          await interaction.reply({
            content: `${emojis.bot.succes} | Mute rolü ayarlamak için rol mention'ı veya rol ID'sini 30s içinde yaz.`,
            ephemeral: true,
          });
          const filter = (m) => m.author.id === message.author.id;
          const collected = await message.channel.awaitMessages({
            filter,
            max: 1,
            time: 30000,
          });
          if (!collected.size)
            return interaction.followUp({
              content: `${emojis.bot.error} | ⏳ Zaman doldu — işlem iptal edildi, tekrar deneyin lütfen~`,
              ephemeral: true,
            });
          const resp = collected.first().content.trim();
          const mentionMatch = resp.match(/^<@&(\d+)>$/);
          const roleId = mentionMatch
            ? mentionMatch[1]
            : resp.match(/^\d+$/)
            ? resp
            : null;
          if (!roleId)
            return interaction.followUp({
              content: `${emojis.bot.error} | ❌ Geçerli rol mention'ı veya ID gir.`,
              ephemeral: true,
            });
          const role = message.guild.roles.cache.get(roleId);
          if (!role)
            return interaction.followUp({
              content: `${emojis.bot.error} | ❌ Rol bulunamadı. ID'yi veya mention'ı kontrol et.`,
              ephemeral: true,
            });
          cfg.muteRoleId = roleId;
          await db.set(`otomod_${guildId}`, cfg);
          const newEmbed = buildStatusEmbed(message.guild, cfg);
          await panelMsg.edit({ embeds: [newEmbed] });
          return interaction.followUp({
            content: `${emojis.bot.succes} | 🔇 Mute rolü olarak ${role.name} ayarlandı.`,
            ephemeral: true,
          });
        }

        if (id.startsWith('feature_toggle::')) {
          await interaction.deferUpdate();
          const feature = id.split('::')[1];
          cfg.features[feature] = cfg.features[feature] || {};
          cfg.features[feature].enabled = !cfg.features[feature].enabled;
          await db.set(`otomod_${guildId}`, cfg);
          const newEmbed = buildStatusEmbed(message.guild, cfg);
          const newComponents = makeMainComponents(cfg);
          await panelMsg.edit({
            embeds: [newEmbed],
            components: newComponents,
            content: null,
          });
          return interaction.followUp({
            content: `${emojis.bot.succes} | \`${feature}\` şimdi **${
              cfg.features[feature].enabled ? 'açık' : 'kapalı'
            }**.`,
            ephemeral: true,
          });
        }

        if (id.startsWith('feature_config::')) {
          await interaction.deferUpdate();
          const feature = id.split('::')[1];
          const feat = cfg.features[feature] || {};
          const detailEmbed = new MessageEmbed()
            .setTitle(`${emojis.bot.succes} | ${feature} yapılandırma`)
            .setDescription(`Mevcut:\n\`${JSON.stringify(feat, null, 2)}\``);
          await panelMsg.edit({
            embeds: [detailEmbed],
            components: makeFeatureDetailComponents(feature, cfg),
            content: null,
          });
          return;
        }

        if (id === 'back_main') {
          await interaction.deferUpdate();
          const newEmbed = buildStatusEmbed(message.guild, cfg);
          const newComponents = makeMainComponents(cfg);
          await panelMsg.edit({
            embeds: [newEmbed],
            components: newComponents,
            content: null,
          });
          return;
        }
      }

      if (interaction.isSelectMenu && interaction.isSelectMenu()) {
        if (interaction.customId === 'feature_select') {
          await interaction.deferUpdate();
          const selected = interaction.values && interaction.values[0];
          if (!selected) return;
          const feat = cfg.features[selected] || {};
          const embed = new MessageEmbed()
            .setTitle(`${emojis.bot.succes} | ⚙️ ${selected} Detayları`)
            .setDescription(`Mevcut:\n\`${JSON.stringify(feat, null, 2)}\``);
          const comps = makeFeatureDetailComponents(selected, cfg);
          await panelMsg.edit({
            embeds: [embed],
            components: comps,
            content: null,
          });
          return;
        }
      }
    } catch (err) {
      console.error('otomod-v2 hata:', err);
      try {
        const animeErr = `${
          emojis.bot.error
        } | ✨ Oopsie! Bir hata ile karşılaşıldı, sempai...\nDetay: ${
          err.message || 'Bilinmeyen hata'
        }\nLütfen komutu tekrar dene veya logları kontrol et — yardım istersen ben buradayım~`;
        if (!interaction.replied && !interaction.deferred) {
          await interaction
            .reply({ content: animeErr, ephemeral: true })
            .catch(() => null);
        } else {
          await interaction
            .followUp({ content: animeErr, ephemeral: true })
            .catch(() => null);
        }
      } catch {}
    }
  });

  collector.on('end', async (collected, reason) => {
    if (reason === 'closed') return;
    try {
      const disabledRows = makeMainComponents(cfg).map((row) => {
        row.components = row.components.map((c) => {
          try {
            c.setDisabled(true);
          } catch (e) {}
          return c;
        });
        return row;
      });
      await panelMsg.edit({
        content: `${emojis.bot.error} | ⏳ Panel süresi doldu. Komutu yeniden çalıştırarak açabilirsin.`,
        components: disabledRows,
      });
    } catch (err) {}
  });
};

exports.help = {
  name: 'otomod',
  aliases: ['otomoderasyon', 'automod', 'otomodd'],
  usage: 'otomod',
  description: 'Sunucu otomod ayarlarını gelişmiş interaktif panel ile yönetir',
  category: 'Moderasyon',
  cooldown: 5,
  permissions: ['MANAGE_GUILD'],
};
