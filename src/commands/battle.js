const fs = require('fs');
const path = require('path');
const { MessageEmbed } = require('discord.js');
const { createBattleEmbed } = require('../utils/battleevent');
const { sendChallenge } = require('../utils/battlefriend');
const { applyXpAndLevel } = require('../utils/levelup');
const DATA_DIR = path.join(__dirname, '..', 'utils');
const PLAYERS_FILE = path.join(DATA_DIR, 'players.json');
const POOL_FILE = path.join(DATA_DIR, 'pool.json');
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
function writeJSON(file, obj) {
  try {
    fs.writeFileSync(file, JSON.stringify(obj, null, 2), 'utf-8');
  } catch (e) {
    console.error('JSON write error:', file, e);
  }
}
function getPlayer(userId) {
  const p = readJSON(PLAYERS_FILE);
  return p[userId] || null;
}
function savePlayer(userId, data) {
  const p = readJSON(PLAYERS_FILE);
  p[userId] = data;
  writeJSON(PLAYERS_FILE, p);
}

// --- Helpers for resolving pets (id or object) and saving modifications back ---
function resolvePet(player, petRef) {
  // petRef can be an object or string id
  if (!petRef) return null;
  if (typeof petRef === 'object') {
    // object form: assume valid
    return petRef;
  }
  // string/number id -> lookup in player.pool
  const pool = (player && player.pool) || {};
  return pool[petRef] || null;
}

function savePetToPlayer(player, pet) {
  // Ensure player.pool exists
  player.pool = player.pool || {};
  if (pet && pet.id) {
    player.pool[pet.id] = pet;
  } else {
    // If there is no id, try match by name in team (rare); otherwise ignore
    // Prefer not to overwrite anything without id
  }
  // Also if player's team contained the pet as an object, update that reference
  if (Array.isArray(player.team)) {
    for (let i = 0; i < player.team.length; i++) {
      const t = player.team[i];
      if (t && typeof t === 'object' && t.id && pet.id && t.id === pet.id) {
        player.team[i] = pet;
      }
    }
  }
}

// --- construct enemy using resolved pet data (so names come from correct place) ---
function constructEnemyFromPlayer(player) {
  const poolFile = readJSON(POOL_FILE) || {};
  const pool = poolFile.PET_POOL || {};
  // Resolve player's team to pet objects
  const playerTeamRefs = player.team || [];
  const playerPets = playerTeamRefs
    .map((p) => resolvePet(player, p))
    .filter(Boolean);

  // build rarity map based on resolved pets
  const rarityMapForPlayer = { legendary: 0, epic: 0, rare: 0, common: 0 };
  playerPets.forEach((pet) => {
    if (pet.items && pet.items.rarity) {
      const r = pet.items.rarity;
      rarityMapForPlayer[r] = (rarityMapForPlayer[r] || 0) + 1;
    }
  });

  const enemy = [];
  for (let i = 0; i < 3; i++) {
    const base = playerPets[i] || { level: 3, name: 'Vahşi' };
    const lvl = Math.max(1, base.level + (Math.floor(Math.random() * 5) - 2));

    const letter =
      rarityMapForPlayer.legendary > 0
        ? 'legendary'
        : rarityMapForPlayer.epic > 0
        ? 'epic'
        : rarityMapForPlayer.rare > 0
        ? 'rare'
        : 'common';

    const choices = pool[letter] || pool['common'] || [];
    const choice = choices[Math.floor(Math.random() * choices.length)] || {
      name: 'Vahşi',
      baseLevel: lvl,
    };

    enemy.push({
      level: lvl,
      name: choice.name || 'Vahşi',
      items: { attack: true, armor: true, magic: true, rarity: letter },
      itemRarityLetter: { legendary: 'L', epic: 'E', rare: 'R', common: 'C' }[
        letter
      ],
    });
  }
  return enemy;
}

function powerOfTeam(team, playerMaybe) {
  // team: array of pet refs or pet objects. If some entries are ids, resolve if player provided.
  const arr = (team || []).map((p) => {
    if (typeof p === 'object') return p;
    if (playerMaybe)
      return resolvePet(playerMaybe, p) || { level: 1, items: {} };
    return { level: 1, items: {} };
  });

  let s = 0;
  arr.forEach((p) => {
    const base = p.level || 1;
    let rMult = 1;
    const r = (p.items && p.items.rarity) || 'common';
    if (r === 'legendary') rMult = 1.5;
    else if (r === 'epic') rMult = 1.3;
    else if (r === 'rare') rMult = 1.1;
    s += base * rMult;
  });
  return s;
}

function maybeCreateBoxForPlayer(userId, player, now) {
  const pool = readJSON(POOL_FILE).WEAPON_POOL || {};
  const weaponsDB = readJSON(WEAPONS_FILE) || {};
  const counts = { legendary: 0, epic: 0, rare: 0, common: 0 };

  // Resolve pets before counting rarities
  const teamRefs = player.team || [];
  teamRefs.forEach((pRef) => {
    const p = resolvePet(player, pRef);
    if (p && p.items && p.items.rarity)
      counts[p.items.rarity] = (counts[p.items.rarity] || 0) + 1;
  });

  let majority = 'common';
  let max = -1;
  for (const r of Object.keys(counts)) {
    if (counts[r] > max) {
      max = counts[r];
      majority = r;
    }
  }
  if (max <= 0) majority = 'common';
  const chosenRarity = majority;

  const attackList = (pool.WEAPON_OF_ATTACK &&
    pool.WEAPON_OF_ATTACK[chosenRarity]) ||
    (pool.WEAPON_OF_ATTACK && pool.WEAPON_OF_ATTACK.common) || [
      { name: 'Tahta Kılıç' },
    ];
  const armorList = (pool.WEAPON_OF_ARMOR &&
    pool.WEAPON_OF_ARMOR[chosenRarity]) ||
    (pool.WEAPON_OF_ARMOR && pool.WEAPON_OF_ARMOR.common) || [
      { name: 'Hırka' },
    ];
  const magicList = (pool.WEAPON_OF_MAGIC &&
    pool.WEAPON_OF_MAGIC[chosenRarity]) ||
    (pool.WEAPON_OF_MAGIC && pool.WEAPON_OF_MAGIC.common) || [
      { name: 'Çubuk' },
    ];

  const attack = attackList[Math.floor(Math.random() * attackList.length)] || {
    name: 'Tahta Kılıç',
  };
  const armor = armorList[Math.floor(Math.random() * armorList.length)] || {
    name: 'Hırka',
  };
  const magic = magicList[Math.floor(Math.random() * magicList.length)] || {
    name: 'Çubuk',
  };

  function genId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let s = '';
    for (let i = 0; i < 6; i++)
      s += chars.charAt(Math.floor(Math.random() * chars.length));
    return s;
  }
  let id;
  do {
    id = genId();
  } while (weaponsDB[id]);

  weaponsDB[id] = {
    id,
    rarity: chosenRarity,
    items: [attack.name, armor.name, magic.name],
    createdAt: now,
    owner: userId,
  };
  writeJSON(WEAPONS_FILE, weaponsDB);
  const short = `Kutu açıldı: (${chosenRarity[0].toUpperCase()}) - ${
    attack.name
  } / ${armor.name} / ${magic.name} - ID: ${id}`;
  return { created: true, message: short };
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function showBoxOpening(channel, boxMessage) {
  const openingEmbed = new MessageEmbed()
    .setTitle(`${emojis.bot.succes} | Kutu Açılıyor...`)
    .setDescription('Biraz sabret, gizemli enerjiler toplanıyor ✨')
    .setColor('GREEN');
  const sent = await channel.send({ embeds: [openingEmbed] });
  const frames = ['[■□□□□]', '[■■□□□]', '[■■■□□]', '[■■■■□]', '[■■■■■]'];
  for (let i = 0; i < frames.length; i++) {
    const e = new MessageEmbed()
      .setTitle(`${emojis.bot.succes} | Kutu Açılıyor...`)
      .setDescription(`${frames[i]}\nEnerji birikiyor...`)
      .setColor('GREEN');
    await sleep(700);
    try {
      await sent.edit({ embeds: [e] });
    } catch (e) {}
  }
  const finalEmbed = new MessageEmbed()
    .setTitle(`${emojis.bot.succes} | Kutu Açıldı!`)
    .setDescription(boxMessage)
    .setColor('GOLD');
  try {
    await sent.edit({ embeds: [finalEmbed] });
  } catch (e) {
    await channel.send({ embeds: [finalEmbed] });
  }
}

module.exports.help = {
  name: 'battle',
  aliases: ['savaş'],
  usage: 'battle',
  description: 'Takımdaki hayvanlarla savaşmaya başla (veya birini etiketle).',
  category: 'Battle',
  cooldown: 10,
};

module.exports.execute = async (client, message, args) => {
  try {
    const userId = message.author.id;
    const mention = message.mentions.users.first();
    const player = getPlayer(userId);
    if (!player || !player.team || player.team.length === 0) {
      const e = new MessageEmbed()
        .setTitle(`${emojis.bot.error} | Takım Bulunamadı`)
        .setDescription(
          'Takımın yok! Önce `team add` ile takımı kur. ｡ﾟ(ﾟ´Д｀ﾟ)ﾟ｡'
        )
        .setColor('RED');
      return message.channel.send({ embeds: [e] });
    }

    // ensure some defaults
    player.streak = player.streak || 0;
    player.winTimestamps = player.winTimestamps || [];
    player.team = player.team || [];

    // Helper: resolve current player's first 3 pets as objects (for power calc & xp)
    const resolvedMyTeam = player.team
      .slice(0, 3)
      .map((pRef) => resolvePet(player, pRef))
      .map((p) => p || { level: 1, name: 'Vahşi', items: {} });

    if (mention && mention.id !== userId) {
      const targetPlayer = getPlayer(mention.id);
      if (
        !targetPlayer ||
        !targetPlayer.team ||
        targetPlayer.team.length === 0
      ) {
        const e = new MessageEmbed()
          .setTitle(`${emojis.bot.error} | Hedefin Takımı Yok`)
          .setDescription(
            'Etiketlediğin kişinin takımı yok. Maceralar beklesin... ｡•́︿•̀｡'
          )
          .setColor('RED');
        return message.channel.send({ embeds: [e] });
      }

      // resolve target's team properly
      const targetResolved = targetPlayer.team
        .slice(0, 3)
        .map((pRef) => resolvePet(targetPlayer, pRef))
        .map((p) => p || { level: 1, name: 'Vahşi', items: {} });

      const res = await sendChallenge(message, message.author, mention, 300000);
      if (!res.accepted) {
        if (res.timeout) return;
        const e = new MessageEmbed()
          .setTitle(`${emojis.bot.error} | Reddedildi`)
          .setDescription(
            'Karşı taraf savaşı reddetti. Belki başka sefer? (╥﹏╥)'
          )
          .setColor('DARK_RED');
        return message.channel.send({ embeds: [e] });
      }

      const myPower = resolvedMyTeam.reduce((s, p) => s + (p.level || 1), 0);
      const enemyPower = targetResolved.reduce((s, p) => s + (p.level || 1), 0);
      const iWon = myPower >= enemyPower;

      player.streak = iWon ? (player.streak || 0) + 1 : 0;
      const xpGain = player.streak * (player.streak * 50);
      const levelUpMessages = [];

      // Apply XP to resolvedMyTeam and save back into player.pool
      for (const pet of resolvedMyTeam) {
        if (!pet) continue;
        pet.xp = (pet.xp || 0) + xpGain;
        const resLevel = applyXpAndLevel(pet, { maxLevel: 999 });
        if (resLevel.levelsGained > 0)
          levelUpMessages.push(
            `${pet.name} ${resLevel.levelsGained} seviye kazandı! Yeni seviye: ${pet.level}`
          );
        // save changes back to player.pool
        savePetToPlayer(player, pet);
      }

      savePlayer(userId, player);

      const embed = createBattleEmbed(
        message.member.displayName || message.author.username,
        resolvedMyTeam,
        targetResolved,
        true,
        player.streak
      );
      await message.channel.send({ embeds: [embed] });

      if (iWon) {
        const winEmbed = new MessageEmbed()
          .setTitle(`${emojis.bot.succes} | Zafer!`)
          .setDescription(
            `Tebrikler! ${mention.username}'ye karşı savaşı kazandın. Streak: ${player.streak}`
          )
          .setColor('GREEN');
        await message.channel.send({ embeds: [winEmbed] });
        if (levelUpMessages.length)
          await message.channel.send(levelUpMessages.join('\n'));
      } else {
        const loseEmbed = new MessageEmbed()
          .setTitle(`${emojis.bot.error} | Kaybettin`)
          .setDescription(
            'Maalesef kaybettin. Bir dahaki sefere daha güçlü dön! (；´Д｀)'
          )
          .setColor('RED');
        await message.channel.send({ embeds: [loseEmbed] });
      }
      return;
    }

    // PvE flow
    const enemyTeam = constructEnemyFromPlayer(player);
    const myPower = powerOfTeam(player.team.slice(0, 3), player);
    const enemyPower = powerOfTeam(enemyTeam);
    const iWon = myPower >= enemyPower;

    player.streak = iWon ? (player.streak || 0) + 1 : 0;
    const xpGain = player.streak * (player.streak * 50);
    const levelUpMessages = [];

    // Apply XP to all pets in player's team (resolve each, change, and save back)
    for (let idx = 0; idx < player.team.length; idx++) {
      const petRef = player.team[idx];
      const petObj = resolvePet(player, petRef);
      if (!petObj) continue;
      petObj.xp = (petObj.xp || 0) + xpGain;
      const res = applyXpAndLevel(petObj, { maxLevel: 999 });
      if (res.levelsGained > 0)
        levelUpMessages.push(
          `${petObj.name} ${res.levelsGained} seviye kazandı! Yeni seviye: ${petObj.level}`
        );
      // Save back
      savePetToPlayer(player, petObj);
      // If team contains object form, keep it up-to-date
      if (typeof petRef === 'object' && petRef.id) player.team[idx] = petObj;
    }

    const now = Date.now();
    player.winTimestamps = (player.winTimestamps || []).filter(
      (ts) => now - ts < 24 * 3600 * 1000
    );
    if (iWon) player.winTimestamps.push(now);
    savePlayer(userId, player);

    const embed = createBattleEmbed(
      message.member.displayName || message.author.username,
      player.team
        .slice(0, 3)
        .map(
          (pRef) =>
            resolvePet(player, pRef) || { level: 1, name: 'Vahşi', items: {} }
        ),
      enemyTeam,
      false,
      player.streak
    );
    await message.channel.send({ embeds: [embed] });

    if (iWon) {
      const winsIn24h = player.winTimestamps.length;
      let boxGot = false;
      if (winsIn24h >= 1 && winsIn24h <= 3) {
        if (Math.random() < 0.8) boxGot = true;
      }
      if (boxGot) {
        const box = maybeCreateBoxForPlayer(userId, player, now);
        if (box && box.created) {
          await showBoxOpening(message.channel, box.message);
        }
      } else {
        const noBoxEmbed = new MessageEmbed()
          .setTitle(`${emojis.bot.succes} | Kutu Yok`)
          .setDescription('Kutu kazanma şansın bu sefer bulunmadı.')
          .setColor('ORANGE');
        await message.channel.send({ embeds: [noBoxEmbed] });
      }

      const winEmbed = new MessageEmbed()
        .setTitle(`${emojis.bot.succes} | Zafer!`)
        .setDescription(
          `Tebrikler! Savaşı kazandın. Streak: ${player.streak}. Her hayvanına ${xpGain} XP eklendi.`
        )
        .setColor('GREEN');
      await message.channel.send({ embeds: [winEmbed] });
      if (levelUpMessages.length)
        await message.channel.send(levelUpMessages.join('\n'));
    } else {
      const loseEmbed = new MessageEmbed()
        .setTitle(`${emojis.bot.error} | Yenildin`)
        .setDescription(
          'Maalesef kaybettin. Streak sıfırlandı. Üzülme, pratikle güçlenirsin! (つД`)･ﾟ｡'
        )
        .setColor('RED');
      await message.channel.send({ embeds: [loseEmbed] });
    }
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
