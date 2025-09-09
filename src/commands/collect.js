const fs = require('fs');
const path = require('path');
const { MessageEmbed } = require('discord.js');
const DATA_DIR = path.join(__dirname, '..', 'utils');
const PLAYERS_FILE = path.join(DATA_DIR, 'players.json');
const POOL_FILE = path.join(DATA_DIR, 'pool.json');
const emojis = require('../emoji.json');

function readJSON(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8') || '{}');
  } catch (e) {
    return {};
  }
}
function writeJSON(file, obj) {
  try {
    fs.writeFileSync(file, JSON.stringify(obj, null, 2), 'utf-8');
  } catch (e) {
    console.error('write error', e);
  }
}

function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

module.exports.help = {
  name: 'collect',
  usage:
    'collect | collect env | collect use <diamond|emerald|heart> | collect stop <diamond|emerald|heart>',
  description:
    'Hayvan toplama komutu. (diamonds/emeralds/hearts etkiler). collect env ile sahip olduklarını gör, collect use ile gem kullan.',
  category: 'Battle',
  cooldown: 10,
};

module.exports.execute = async (client, message, args) => {
  const userId = message.author.id;
  const sub = (args[0] || '').toLowerCase();

  const playerDB = readJSON(PLAYERS_FILE);
  const pools = readJSON(POOL_FILE);

  const defaults = {
    inventory: { diamonds: [], emeralds: [], hearts: [] },
    team: [],
    pool: {},
    activeGems: { diamond: false, emerald: false, heart: false },
  };

  const player = Object.assign({}, defaults, playerDB[userId] || {});

  if (sub === 'env') {
    const fields = [];
    fields.push({
      name: 'Diamonds',
      value: `${player.inventory.diamonds.length} adet`,
      inline: true,
    });
    fields.push({
      name: 'Emeralds',
      value: `${player.inventory.emeralds.length} adet`,
      inline: true,
    });
    fields.push({
      name: 'Hearts',
      value: `${player.inventory.hearts.length} adet`,
      inline: true,
    });
    fields.push({
      name: 'Kullanılan Gemler',
      value: `Diamond: ${
        player.activeGems.diamond ? 'Aktif' : 'Kapalı'
      }\nEmerald: ${player.activeGems.emerald ? 'Aktif' : 'Kapalı'}\nHeart: ${
        player.activeGems.heart ? 'Aktif' : 'Kapalı'
      }`,
      inline: false,
    });

    const chunks = chunkArray(fields, 6);
    for (let i = 0; i < chunks.length; i++) {
      const embed = new MessageEmbed()
        .setTitle(`${emojis.bot.succes} | Gem Envanteri`)
        .setDescription('Elindeki gemlerin özeti aşağıda, senpai~')
        .setColor('GREEN');
      chunks[i].forEach((f) => embed.addField(f.name, f.value, f.inline));
      if (chunks.length > 1) embed.setFooter(`Sayfa ${i + 1}/${chunks.length}`);
      await message.channel.send({ embeds: [embed] });
    }
    return;
  }

  if (sub === 'use') {
    const t = (args[1] || '').toLowerCase();
    if (!['diamond', 'emerald', 'heart'].includes(t)) {
      const e = new MessageEmbed()
        .setTitle(`${emojis.bot.error} | Hatalı Kullanım`)
        .setDescription(
          'Kullanım: collect use <diamond|emerald|heart> — hangi gemi kullanmak istediğini yaz, senpai~'
        )
        .setColor('DARK_RED');
      return message.channel.send({ embeds: [e] });
    }
    if (player.activeGems[t]) {
      const e = new MessageEmbed()
        .setTitle(`${emojis.bot.error} | Zaten Aktif`)
        .setDescription(
          `Bu kategoriden zaten 1 adet aktif. Aynı kategoriden yalnızca 1 gem kullanabilirsin, ne yazık ki... (╥﹏╥)`
        )
        .setColor('DARK_RED');
      return message.channel.send({ embeds: [e] });
    }
    const invKey =
      t === 'diamond' ? 'diamonds' : t === 'emerald' ? 'emeralds' : 'hearts';
    if (!player.inventory[invKey] || player.inventory[invKey].length === 0) {
      const e = new MessageEmbed()
        .setTitle(`${emojis.bot.error} | Bulunamadı`)
        .setDescription(
          `Elinde ${t} yokmuş gibi görünüyor. Önce onu toplamayı dene, sempai.`
        )
        .setColor('DARK_RED');
      return message.channel.send({ embeds: [e] });
    }
    player.inventory[invKey].pop();
    player.activeGems[t] = true;
    playerDB[userId] = player;
    writeJSON(PLAYERS_FILE, playerDB);

    const s = new MessageEmbed()
      .setTitle(`${emojis.bot.succes} | Gem Kullanıldı`)
      .setDescription(`Başarıyla 1 ${t} kullandın. Etki şimdi aktif! Ganbatte~`)
      .setColor('GREEN');
    return message.channel.send({ embeds: [s] });
  }

  if (sub === 'stop') {
    const t = (args[1] || '').toLowerCase();
    if (!['diamond', 'emerald', 'heart'].includes(t)) {
      const e = new MessageEmbed()
        .setTitle(`${emojis.bot.error} | Hatalı Kullanım`)
        .setDescription(
          'Kullanım: collect stop <diamond|emerald|heart> — hangi gemi devre dışı bırakacağını yaz.'
        )
        .setColor('DARK_RED');
      return message.channel.send({ embeds: [e] });
    }
    if (!player.activeGems[t]) {
      const e = new MessageEmbed()
        .setTitle(`${emojis.bot.error} | Zaten Kapalı`)
        .setDescription(
          `Bu kategoride aktif bir gemin yok ki devre dışı bırakabileyim, sempai. (。_。)`
        )
        .setColor('DARK_RED');
      return message.channel.send({ embeds: [e] });
    }
    player.activeGems[t] = false;
    playerDB[userId] = player;
    writeJSON(PLAYERS_FILE, playerDB);
    const s = new MessageEmbed()
      .setTitle(`${emojis.bot.succes} | Gem Devre Dışı`)
      .setDescription(
        `${t} artık devre dışı. Dinlenip geri gelebilirsin, sempai~`
      )
      .setColor('GREEN');
    return message.channel.send({ embeds: [s] });
  }

  const weightBase = { common: 70, rare: 20, epic: 8, legendary: 2 };
  const weight = Object.assign({}, weightBase);

  const invEmeralds = player.inventory.emeralds || [];
  if (invEmeralds.length > 0) {
    weight.common = Math.max(0, weight.common - 20);
    weight.rare += 10;
    weight.epic += 8;
    weight.legendary += 2;
  }
  if (player.activeGems.emerald) {
    weight.common = Math.max(0, weight.common - 30);
    weight.rare += 15;
    weight.epic += 10;
    weight.legendary += 5;
  }

  const sum = Object.values(weight).reduce((a, b) => a + b, 0);
  let r = Math.random() * sum;
  let cum = 0;
  let rarity = 'common';
  for (const k of Object.keys(weight)) {
    cum += weight[k];
    if (r <= cum) {
      rarity = k;
      break;
    }
  }

  const choices =
    (pools.PET_POOL && pools.PET_POOL[rarity]) ||
    (pools.PET_POOL && pools.PET_POOL.common) ||
    [];
  if (!choices.length) {
    const e = new MessageEmbed()
      .setTitle(`${emojis.bot.error} | Havuz Boş`)
      .setDescription(
        'Maalesef pet havuzunda uygun bir pet bulunamadı. Admin ile konuşur musun, sempai?'
      )
      .setColor('DARK_RED');
    return message.channel.send({ embeds: [e] });
  }

  const pick = choices[Math.floor(Math.random() * choices.length)];
  const newPet = {
    id: `${Date.now()}${Math.floor(Math.random() * 1000)}`,
    name: pick.name || 'Vahşi',
    level: pick.baseLevel || 1,
    xp: 0,
    items: {},
  };

  const invHearts = player.inventory.hearts || [];
  if (invHearts.length > 0) newPet.xp += 50;
  if (player.activeGems.heart) newPet.xp += 100;

  const foundGems = [];
  const gemRoll = Math.random() * 100;
  let diamondChance = 5;
  let emeraldChance = 10;
  let heartChance = 25;

  if (player.activeGems.diamond) diamondChance += 10;
  if (player.activeGems.emerald) {
    /* already applied to rarity */
  }
  if (player.activeGems.heart) {
    /* heart gives xp above */
  }

  if (gemRoll <= diamondChance) {
    player.inventory.diamonds = player.inventory.diamonds || [];
    player.inventory.diamonds.push({
      id: `${Date.now()}d${Math.floor(Math.random() * 1000)}`,
    });
    foundGems.push('diamond');
  } else if (gemRoll <= diamondChance + emeraldChance) {
    player.inventory.emeralds = player.inventory.emeralds || [];
    player.inventory.emeralds.push({
      id: `${Date.now()}e${Math.floor(Math.random() * 1000)}`,
    });
    foundGems.push('emerald');
  } else if (gemRoll <= diamondChance + emeraldChance + heartChance) {
    player.inventory.hearts = player.inventory.hearts || [];
    player.inventory.hearts.push({
      id: `${Date.now()}h${Math.floor(Math.random() * 1000)}`,
    });
    foundGems.push('heart');
  }

  player.pool = player.pool || {};
  player.pool[newPet.id] = newPet;

  if (player.inventory.diamonds && player.inventory.diamonds.length > 0)
    player.inventory.diamonds = player.inventory.diamonds;
  if (player.inventory.emeralds && player.inventory.emeralds.length > 0)
    player.inventory.emeralds = player.inventory.emeralds;
  if (player.inventory.hearts && player.inventory.hearts.length > 0)
    player.inventory.hearts = player.inventory.hearts;

  playerDB[userId] = player;
  writeJSON(PLAYERS_FILE, playerDB);

  const fields = [];
  fields.push({
    name: 'Pet',
    value: `${newPet.name} (Lv ${newPet.level})`,
    inline: true,
  });
  fields.push({ name: 'Rarity', value: rarity.toUpperCase(), inline: true });
  fields.push({ name: 'Gained XP', value: `${newPet.xp} XP`, inline: true });
  if (foundGems.length)
    fields.push({
      name: 'Bulunan Gemler',
      value: foundGems.map((g) => g.toUpperCase()).join(', '),
      inline: false,
    });
  fields.push({
    name: 'Envanter (Özet)',
    value: `Diamonds: ${player.inventory.diamonds.length} • Emeralds: ${player.inventory.emeralds.length} • Hearts: ${player.inventory.hearts.length}`,
    inline: false,
  });
  fields.push({
    name: 'Aktif Gemler',
    value: `Diamond: ${
      player.activeGems.diamond ? 'Aktif' : 'Kapalı'
    }\nEmerald: ${player.activeGems.emerald ? 'Aktif' : 'Kapalı'}\nHeart: ${
      player.activeGems.heart ? 'Aktif' : 'Kapalı'
    }`,
    inline: false,
  });

  const chunks = chunkArray(fields, 6);
  for (let i = 0; i < chunks.length; i++) {
    const embed = new MessageEmbed()
      .setTitle(`${emojis.bot.succes} | Yeni Hayvan Toplandı`)
      .setDescription('Yatta! Yeni bir pet topladın, çok sevimli! Kawaii~')
      .setColor('GREEN');
    chunks[i].forEach((f) => embed.addField(f.name, f.value, f.inline));
    if (i === 0 && foundGems.length === 0)
      embed.setFooter('Hiç gem bulamadın bu sefer ama üzülme, tekrar dene~');
    if (chunks.length > 1) embed.setFooter(`Sayfa ${i + 1}/${chunks.length}`);
    await message.channel.send({ embeds: [embed] });
  }
};
