const fs = require('fs');
const path = require('path');
const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
const DATA_DIR = path.join(__dirname, '..', 'utils');
const WEAPONS_FILE = path.join(DATA_DIR, 'weapons.json');
const emojis = require('../emoji.json');

function readJSON(file) {
  try {
    const raw = fs.readFileSync(file, 'utf-8');
    return JSON.parse(raw || '{}');
  } catch (e) {
    return {};
  }
}

module.exports.help = {
  name: 'weapons',
  aliases: ['silahlar', 'eşyalar'],
  usage: 'weapons',
  description: 'Elde ettiğin eşyaları gösterir.',
  category: 'Battle',
  cooldown: 10,
};

module.exports.execute = async (client, message, args) => {
  try {
    const wdb = readJSON(WEAPONS_FILE);
    const list = Object.values(wdb || {});
    if (!list || list.length === 0) {
      const e = new MessageEmbed()
        .setTitle(`${emojis.bot.error} | Hiç Eşya Yok`)
        .setDescription(
          'Henüz herhangi bir eşyan yokmuş gibi görünüyor... Macera seni bekliyor! (｡•́︿•̀｡)'
        )
        .setColor('DARK_RED');
      return message.channel.send({ embeds: [e] });
    }

    // normalize items -> string, and ensure non-empty values
    const items = list.map((w) => {
      // name
      const rarityLetter =
        w.rarity && String(w.rarity)[0]
          ? String(w.rarity)[0].toUpperCase()
          : '?';
      const rarityFull = w.rarity || '?';
      const name = `${w.id || '—'} — (${rarityLetter}) ${rarityFull}`;

      // items can be array, object, string, or missing
      let itemStr = '—';
      if (Array.isArray(w.items) && w.items.length) {
        itemStr = w.items.join(' / ');
      } else if (typeof w.items === 'string' && w.items.trim().length) {
        itemStr = w.items;
      } else if (w.items && typeof w.items === 'object') {
        // try to stringify useful parts
        const vals = Object.values(w.items).filter(Boolean);
        if (vals.length) itemStr = vals.join(' / ');
      }

      const ownerStr = w.owner ? `\nSahip: <@${w.owner}>` : '';
      const value = (itemStr + ownerStr).trim() || '—';

      return {
        name: String(name).slice(0, 256),
        value: String(value).slice(0, 1024),
      };
    });

    const fieldsPerPage = 5;
    const pages = [];
    for (let i = 0; i < items.length; i += fieldsPerPage) {
      const chunk = items.slice(i, i + fieldsPerPage);
      const embed = new MessageEmbed()
        .setTitle(
          `${emojis.bot.succes} | Eşyaların — Sayfa ${
            Math.floor(i / fieldsPerPage) + 1
          }/${Math.ceil(items.length / fieldsPerPage)}`
        )
        .setDescription(
          'Toplam eşyaların aşağıda listelenmiştir. Detay için sayfaları gezebilirsin ✨'
        )
        .setColor('GREEN');

      // addField yerine addFields ile güvenli ekleme
      const toAdd = chunk.map((f) => ({
        name: f.name || '—',
        value: f.value || '—',
        inline: false,
      }));
      embed.addFields(toAdd);
      pages.push(embed);
    }

    let current = 0;
    if (pages.length === 1) {
      return message.channel.send({ embeds: [pages[0]] });
    }

    const row = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId('prev_weapons')
        .setLabel('◀️ Geri')
        .setStyle('SECONDARY'),
      new MessageButton()
        .setCustomId('stop_weapons')
        .setLabel('⏹️ Durdur')
        .setStyle('DANGER'),
      new MessageButton()
        .setCustomId('next_weapons')
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
      if (i.customId === 'prev_weapons') {
        current = (current - 1 + pages.length) % pages.length;
        await sent.edit({ embeds: [pages[current]], components: [row] });
      } else if (i.customId === 'next_weapons') {
        current = (current + 1) % pages.length;
        await sent.edit({ embeds: [pages[current]], components: [row] });
      } else if (i.customId === 'stop_weapons') {
        collector.stop('user_stopped');
      }
    });

    collector.on('end', async () => {
      const disabledRow = new MessageActionRow().addComponents(
        new MessageButton()
          .setCustomId('prev_weapons')
          .setLabel('◀️ Geri')
          .setStyle('SECONDARY')
          .setDisabled(true),
        new MessageButton()
          .setCustomId('stop_weapons')
          .setLabel('⏹️ Durdur')
          .setStyle('DANGER')
          .setDisabled(true),
        new MessageButton()
          .setCustomId('next_weapons')
          .setLabel('İleri ▶️')
          .setStyle('SECONDARY')
          .setDisabled(true)
      );
      try {
        await sent.edit({
          embeds: [
            pages[current].setFooter(
              `Zaman aşımına uğradı — görüntüleme sonlandı.`
            ),
          ],
          components: [disabledRow],
        });
      } catch (e) {}
    });
  } catch (err) {
    const errEmbed = new MessageEmbed()
      .setTitle(`${emojis.bot.error} | Uwaa~ Bir hata oldu!`)
      .setDescription(
        `Hata: ${
          err.message || String(err)
        }\nLütfen daha sonra tekrar dene. (；へ：)`
      )
      .setColor('DARK_RED');
    return message.channel.send({ embeds: [errEmbed] });
  }
};
