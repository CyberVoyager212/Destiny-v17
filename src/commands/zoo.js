const fs = require('fs');
const path = require('path');
const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
const DATA_DIR = path.join(__dirname, '..', 'utils');
const PLAYERS_FILE = path.join(DATA_DIR, 'players.json');
const emojis = require('../emoji.json');

function readJSON(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8') || '{}');
  } catch (e) {
    return {};
  }
}

module.exports.help = {
  name: 'zoo',
  aliases: ['hayvanlar'],
  usage: 'zoo',
  description: 'Toplanan hayvanları gösterir.',
  category: 'Battle',
  cooldown: 10,
};

module.exports.execute = async (client, message, args) => {
  try {
    const players = readJSON(PLAYERS_FILE);
    const me = players[message.author.id] || {};
    // collect komutunun kaydettiği yer: me.pool
    let pool = me.pool || {};

    // Normalizasyon: eğer pool array ise objeye çevir
    if (Array.isArray(pool)) {
      const tmp = {};
      pool.forEach((p) => {
        if (p && p.id) tmp[p.id] = p;
      });
      pool = tmp;
    }

    const petList = Object.values(pool || {}).filter(Boolean);

    if (!petList || petList.length === 0) {
      const noEmbed = new MessageEmbed()
        .setTitle(`${emojis.bot.error} | Hiç hayvan bulunamadı!`)
        .setDescription(
          'Oopsie~ Hiçbir hayvanın yokmuş gibi görünüyor. Maceraya atıl ve sevimli bir tane yakala! (｡•́︿•̀｡)'
        )
        .setColor('RED');
      return message.channel.send({ embeds: [noEmbed] });
    }

    const items = petList.map((p) => ({
      name: p.name || 'İsimsiz',
      value: `Lv:${p.level || 1} • XP:${p.xp || 0} • ID:${p.id || '-'}`,
    }));

    const fieldsPerPage = 5;
    const pages = [];
    for (let i = 0; i < items.length; i += fieldsPerPage) {
      const chunk = items.slice(i, i + fieldsPerPage);
      const embed = new MessageEmbed()
        .setTitle(
          `🐾 Hayvanların — Sayfa ${
            Math.floor(i / fieldsPerPage) + 1
          }/${Math.ceil(items.length / fieldsPerPage)}`
        )
        .setDescription(
          'Aşağıda topladığın hayvanların kısa bir özeti var. Daha fazlası için sayfaları gez!'
        )
        .setColor('GREEN')
        .setFooter({
          text: `İyi şanslar, eğlenceli avlamalar!`,
        });
      chunk.forEach((f) => embed.addField(f.name, f.value, true));
      pages.push(embed);
    }

    let current = 0;
    if (pages.length === 1) {
      return message.channel.send({ embeds: [pages[0]] });
    }

    const row = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId('prev_zoo')
        .setLabel('◀️ Geri')
        .setStyle('SECONDARY'),
      new MessageButton()
        .setCustomId('stop_zoo')
        .setLabel('⏹️ Durdur')
        .setStyle('DANGER'),
      new MessageButton()
        .setCustomId('next_zoo')
        .setLabel('İleri ▶️')
        .setStyle('SECONDARY')
    );

    const sent = await message.channel.send({
      embeds: [pages[current]],
      components: [row],
    });

    const filter = (i) => i.user.id === message.author.id;
    const collector = sent.createMessageComponentCollector({
      filter,
      time: 120000,
    });

    collector.on('collect', async (i) => {
      await i.deferUpdate();
      if (i.customId === 'prev_zoo') {
        current = (current - 1 + pages.length) % pages.length;
        await sent.edit({ embeds: [pages[current]], components: [row] });
      } else if (i.customId === 'next_zoo') {
        current = (current + 1) % pages.length;
        await sent.edit({ embeds: [pages[current]], components: [row] });
      } else if (i.customId === 'stop_zoo') {
        collector.stop('user_stopped');
      }
    });

    collector.on('end', async () => {
      const disabledRow = new MessageActionRow().addComponents(
        new MessageButton()
          .setCustomId('prev_zoo')
          .setLabel('◀️ Geri')
          .setStyle('SECONDARY')
          .setDisabled(true),
        new MessageButton()
          .setCustomId('stop_zoo')
          .setLabel('⏹️ Durdur')
          .setStyle('DANGER')
          .setDisabled(true),
        new MessageButton()
          .setCustomId('next_zoo')
          .setLabel('İleri ▶️')
          .setStyle('SECONDARY')
          .setDisabled(true)
      );
      try {
        await sent.edit({
          embeds: [
            pages[current].setFooter({
              text: `${emojis.bot.succes} Ziyafet bitti — butonlar zaman aşımına uğradı!`,
            }),
          ],
          components: [disabledRow],
        });
      } catch (e) {
        // sessizce yut
      }
    });
  } catch (err) {
    const errEmbed = new MessageEmbed()
      .setTitle(`${emojis.bot.error} | Uwaa~ Bir hata oldu!`)
      .setDescription(
        `Böyle şeyler bazen olur... Lütfen daha sonra tekrar dene!\n\n\`\`\`${
          err.message || String(err)
        }\`\`\``
      )
      .setColor('DARK_RED');
    return message.channel.send({ embeds: [errEmbed] });
  }
};
