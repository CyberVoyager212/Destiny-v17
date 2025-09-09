const fs = require('fs');
const path = require('path');
const { MessageEmbed } = require('discord.js');
const DATA_DIR = path.join(__dirname, '..', 'utils');
const PLAYERS_FILE = path.join(DATA_DIR, 'players.json');
const WEAPONS_FILE = path.join(DATA_DIR, 'weapons.json');
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
    console.error('JSON write error:', e);
  }
}

module.exports.help = {
  name: 'team',
  aliases: ['takım'],
  usage: 'team add/remove/list | team weapon <slot> <weaponId|remove>',
  description:
    'Takım yönetimi: add/remove/list ve team weapon <slot> <weaponId|remove>',
  category: 'Battle',
  cooldown: 10,
};

module.exports.execute = async (client, message, args) => {
  const userId = message.author.id;
  const sub = (args[0] || '').toLowerCase();

  const players = readJSON(PLAYERS_FILE);
  const weaponsDB = readJSON(WEAPONS_FILE);

  // Kullanıcının kaydı - yeni pool tabanlı yapı
  const defaultMe = {
    team: [null, null, null], // slotlar -> petId veya null
    pool: {}, // petId: { id, name, level, items: {...} }
    inventory: { diamonds: [], emeralds: [], hearts: [] },
  };

  const meRaw = players[userId] || {};
  // Merge defaults but keep old values
  const me = Object.assign({}, defaultMe, meRaw);

  // Normalizasyon: eski formatta takımda obje tutuluyorsa pool'a taşı
  try {
    if (Array.isArray(me.team)) {
      for (let i = 0; i < me.team.length; i++) {
        const slotVal = me.team[i];
        // Eğer slot bir obje (eski format) — objede id varsa pool'a taşı
        if (slotVal && typeof slotVal === 'object' && slotVal.id) {
          const pet = slotVal;
          me.pool[pet.id] = me.pool[pet.id] || pet;
          me.team[i] = pet.id;
        }
        // Eğer slot string/number ise bırak (petId olarak)
      }
    } else {
      // Eğer team farklı bir formatsa resetle
      me.team = [null, null, null];
    }

    // Eğer pool eski formatta (ör. array) normalize et
    if (Array.isArray(me.pool)) {
      const newPool = {};
      me.pool.forEach((p) => {
        if (p && p.id) newPool[p.id] = p;
      });
      me.pool = newPool;
    }
  } catch (err) {
    console.error('Normalization error:', err);
  }

  // Yardımcı: pool içinde id veya isimle pet bul
  function findPetInPool(identifier) {
    if (!identifier) return null;
    // Eğer direk id varsa
    if (me.pool[identifier]) return me.pool[identifier];
    // İsim ile bul (case-insensitive)
    const byName = Object.values(me.pool).find(
      (p) => p && p.name && p.name.toLowerCase() === identifier.toLowerCase()
    );
    return byName || null;
  }

  if (sub === 'add') {
    const slot = parseInt(args[1]);
    const petIdentifier = args[2];
    const weaponId = args[3];

    if (!slot || slot < 1 || slot > 3) {
      const e = new MessageEmbed()
        .setTitle(`${emojis.bot.error} | Hatalı Slot`)
        .setDescription(
          'Slot 1-3 arası olmalı! Lütfen doğru bir slot numarası gir.'
        )
        .setColor('RED');
      return message.channel.send({ embeds: [e] });
    }

    if (!petIdentifier) {
      const e = new MessageEmbed()
        .setTitle(`${emojis.bot.error} | Eksik Argüman`)
        .setDescription(
          'Kullanım: `team add <slot 1-3> <petId|petName> [weaponId]`'
        )
        .setColor('ORANGE');
      return message.channel.send({ embeds: [e] });
    }

    const pet = findPetInPool(petIdentifier);

    if (!pet) {
      const e = new MessageEmbed()
        .setTitle(`${emojis.bot.error} | Hayvan Bulunamadı`)
        .setDescription(
          "Üzgünüm~ Pool'unda aradığın hayvan yok. Önce hayvanı pool'a eklemelisin (ör: `pet add <id> <name>`)." // notifikasyon, komut örneği sunuldu
        )
        .setColor('DARK_RED');
      return message.channel.send({ embeds: [e] });
    }

    // Eğer silah da verildiyse tak
    if (weaponId) {
      const weapon = weaponsDB[weaponId];
      if (!weapon) {
        const e = new MessageEmbed()
          .setTitle(`${emojis.bot.error} | Silah Yok`)
          .setDescription(
            "Bu ID'ye sahip bir silah bulunamadı. ID'yi kontrol et, sonra tekrar dene. (；へ：)"
          )
          .setColor('DARK_RED');
        return message.channel.send({ embeds: [e] });
      }

      if (weapon.owner && weapon.owner !== userId) {
        const e = new MessageEmbed()
          .setTitle(`${emojis.bot.error} | Sahiplik Hatası`)
          .setDescription(
            'Bu eşyaya başka biri sahipmiş gibi görünüyor. Başkalarının eşyalarını alamazsın! (╥﹏╥)'
          )
          .setColor('RED');
        return message.channel.send({ embeds: [e] });
      }

      // Silah sahibini ve equipped bilgisini güncelle
      weapon.owner = userId;
      weapon.equippedTo = { userId, slot, petId: pet.id };

      // Pet'e item bilgilerini pool içinde kaydet
      me.pool[pet.id] = me.pool[pet.id] || pet;
      me.pool[pet.id].items = me.pool[pet.id].items || {};
      const items = weapon.items || [];
      me.pool[pet.id].items.attack =
        items[0] || me.pool[pet.id].items.attack || null;
      me.pool[pet.id].items.armor =
        items[1] || me.pool[pet.id].items.armor || null;
      me.pool[pet.id].items.magic =
        items[2] || me.pool[pet.id].items.magic || null;
      me.pool[pet.id].items.rarity =
        weapon.rarity || me.pool[pet.id].items.rarity || 'common';
      me.pool[pet.id].items.weaponId = weaponId;

      // Takımı slot'a petId olarak kaydet
      me.team[slot - 1] = pet.id;

      // Persist
      weaponsDB[weaponId] = weapon;
      players[userId] = me;
      writeJSON(WEAPONS_FILE, weaponsDB);
      writeJSON(PLAYERS_FILE, players);

      const s = new MessageEmbed()
        .setTitle(`${emojis.bot.succes} | Başarı!`)
        .setDescription(
          `${pet.name} başarıyla slot ${slot}'e eklendi ve weapon ${weaponId} takıldı.`
        )
        .setColor('GREEN');
      return message.channel.send({ embeds: [s] });
    }

    // Sadece pet ekleme (silahsız)
    me.team[slot - 1] = pet.id;
    players[userId] = me;
    writeJSON(PLAYERS_FILE, players);

    const s = new MessageEmbed()
      .setTitle(`${emojis.bot.succes} | Tamamlandı`)
      .setDescription(`${pet.name} başarıyla slot ${slot}'e eklendi.`)
      .setColor('GREEN');
    return message.channel.send({ embeds: [s] });
  } else if (sub === 'remove' || sub === 'sil') {
    const slot = parseInt(args[1]);
    if (!slot || slot < 1 || slot > 3) {
      const e = new MessageEmbed()
        .setTitle(`${emojis.bot.error} | Hatalı Slot`)
        .setDescription('Slot 1-3 arası olmalı. Lütfen geçerli bir slot gir.')
        .setColor('RED');
      return message.channel.send({ embeds: [e] });
    }

    const petId = me.team[slot - 1];
    if (petId) {
      const petObj = me.pool[petId];
      if (petObj && petObj.items && petObj.items.weaponId) {
        const wid = petObj.items.weaponId;
        const w = weaponsDB[wid];
        if (
          w &&
          w.equippedTo &&
          w.equippedTo.userId === userId &&
          w.equippedTo.slot === slot &&
          w.equippedTo.petId === petId
        ) {
          delete w.equippedTo;
          weaponsDB[wid] = w;
          writeJSON(WEAPONS_FILE, weaponsDB);
        }
      }
    }

    me.team[slot - 1] = null;
    players[userId] = me;
    writeJSON(PLAYERS_FILE, players);

    const s = new MessageEmbed()
      .setTitle(`${emojis.bot.succes} | Slot Temizlendi`)
      .setDescription(`Slot ${slot} başarıyla temizlendi.`)
      .setColor('GREEN');
    return message.channel.send({ embeds: [s] });
  } else if (sub === 'weapon') {
    const slot = parseInt(args[1]);
    const opt = args[2];

    if (!slot || slot < 1 || slot > 3) {
      const e = new MessageEmbed()
        .setTitle(`${emojis.bot.error} | Hatalı Slot`)
        .setDescription(
          'Slot 1-3 arası olmalı. Doğru slotu gir ve tekrar dene.'
        )
        .setColor('RED');
      return message.channel.send({ embeds: [e] });
    }

    const petId = me.team[slot - 1];
    if (!petId) {
      const e = new MessageEmbed()
        .setTitle(`${emojis.bot.error} | Slot Boş`)
        .setDescription(
          'Bu slotta bir hayvan yok. Önce hayvanı takıma ekle, sonra silah takmaya çalış.'
        )
        .setColor('DARK_RED');
      return message.channel.send({ embeds: [e] });
    }

    const pet = me.pool[petId];
    if (!pet) {
      const e = new MessageEmbed()
        .setTitle(`${emojis.bot.error} | Hata`)
        .setDescription(
          "Slotta görünen pet pool'da mevcut değil. Lütfen admin ile iletişime geç veya veriyi düzelt."
        )
        .setColor('DARK_RED');
      return message.channel.send({ embeds: [e] });
    }

    if (!opt) {
      const e = new MessageEmbed()
        .setTitle(`${emojis.bot.error} | Eksik Argüman`)
        .setDescription('Kullanım: `team weapon <slot 1-3> <weaponId|remove>`')
        .setColor('ORANGE');
      return message.channel.send({ embeds: [e] });
    }

    if (opt.toLowerCase() === 'remove' || opt.toLowerCase() === 'unequip') {
      if (pet.items && pet.items.weaponId) {
        const wid = pet.items.weaponId;
        const w = weaponsDB[wid];
        if (
          w &&
          w.equippedTo &&
          w.equippedTo.userId === userId &&
          w.equippedTo.slot === slot &&
          w.equippedTo.petId === petId
        ) {
          delete w.equippedTo;
          weaponsDB[wid] = w;
        }
        // pet'in item bilgilerini temizle
        delete pet.items.attack;
        delete pet.items.armor;
        delete pet.items.magic;
        delete pet.items.weaponId;
        delete pet.items.rarity;
        me.pool[petId] = pet;

        players[userId] = me;
        writeJSON(WEAPONS_FILE, weaponsDB);
        writeJSON(PLAYERS_FILE, players);

        const s = new MessageEmbed()
          .setTitle(`${emojis.bot.succes} | Silah Çıkarıldı`)
          .setDescription(`Slot ${slot}'teki silah başarıyla çıkarıldı.`)
          .setColor('GREEN');
        return message.channel.send({ embeds: [s] });
      } else {
        const e = new MessageEmbed()
          .setTitle(`${emojis.bot.error} | Silah Yok`)
          .setDescription(
            'Bu slotta takılı bir silah yokmuş gibi görünüyor. (。_。)'
          )
          .setColor('DARK_RED');
        return message.channel.send({ embeds: [e] });
      }
    }

    const weaponId = opt;
    const weapon = weaponsDB[weaponId];
    if (!weapon) {
      const e = new MessageEmbed()
        .setTitle(`${emojis.bot.error} | Silah Bulunamadı`)
        .setDescription(
          "Böyle bir weapon ID'si bulunamadı. ID'yi kontrol et lütfen."
        )
        .setColor('DARK_RED');
      return message.channel.send({ embeds: [e] });
    }

    if (weapon.owner && weapon.owner !== userId) {
      const e = new MessageEmbed()
        .setTitle(`${emojis.bot.error} | Sahiplik Hatası`)
        .setDescription(
          'Bu eşyaya başka bir kullanıcı sahip. Başkalarının eşyalarını takamazsın!'
        )
        .setColor('RED');
      return message.channel.send({ embeds: [e] });
    }

    // Silahı tak
    weapon.owner = userId;
    weapon.equippedTo = { userId, slot, petId };

    pet.items = pet.items || {};
    const items = weapon.items || [];
    pet.items.attack = items[0] || pet.items.attack || null;
    pet.items.armor = items[1] || pet.items.armor || null;
    pet.items.magic = items[2] || pet.items.magic || null;
    pet.items.rarity = weapon.rarity || pet.items.rarity || 'common';
    pet.items.weaponId = weaponId;

    // Kaydet
    weaponsDB[weaponId] = weapon;
    me.pool[petId] = pet;
    players[userId] = me;
    writeJSON(WEAPONS_FILE, weaponsDB);
    writeJSON(PLAYERS_FILE, players);

    const s = new MessageEmbed()
      .setTitle(`${emojis.bot.succes} | Silah Takıldı`)
      .setDescription(`Slot ${slot}'e weapon ${weaponId} başarıyla takıldı.`)
      .setColor('GREEN');
    return message.channel.send({ embeds: [s] });
  } else {
    // default: team listele
    const embed = new MessageEmbed()
      .setTitle(`${emojis.bot.succes} | Takımın`)
      .setDescription('Aşağıda takımdaki slotların özeti bulunuyor:')
      .setColor('GREEN');

    (me.team || [null, null, null]).forEach((petId, i) => {
      const idx = i + 1;
      if (petId) {
        const p = me.pool[petId];
        if (p) {
          embed.addField(
            `Slot ${idx}`,
            `${p.name} (Lv ${p.level || 1})${
              p.items && p.items.weaponId ? ` — Weapon:${p.items.weaponId}` : ''
            }`
          );
        } else {
          embed.addField(
            `Slot ${idx}`,
            `— (petId:${petId} bulundu ama pool'da yok)`
          );
        }
      } else {
        embed.addField(`Slot ${idx}`, `—`);
      }
    });

    return message.channel.send({ embeds: [embed] });
  }
};
