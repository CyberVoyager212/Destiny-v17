const { MessageEmbed } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

module.exports.execute = async (client, message, args) => {
  const guild = message.guild;

  if (!args[0]) {
    return message.reply(
      '🌸 Lütfen bir işlem belirt: `bom oluştur`, `bom sil`, `kelime oluştur`, `kelime sil`'
    );
  }

  const action = args[0].toLowerCase();
  const type = args[1]?.toLowerCase();

  if (
    !['bom', 'kelime'].includes(action) ||
    !['oluştur', 'sil'].includes(type)
  ) {
    return message.reply(
      '⚠️ Kullanım: `!oyun bom oluştur` veya `!oyun kelime sil`'
    );
  }

  if (action === 'bom') {
    if (type === 'oluştur') {
      try {
        const existing = await db.get(`bom_${guild.id}`);
        if (existing) return message.reply('💣 BOM kanalı zaten mevcut!');

        const channel = await guild.channels.create('💣┃ＢＯＭ', {
          type: 'GUILD_TEXT',
          reason: 'Oyun BOM kanalı oluşturuldu',
          topic:
            '💣 BOM Oyunu — Sayıları sırayla yaz, 5’in katında “BOM” yaz! 🚀',
        });

        await db.set(`bom_${guild.id}`, channel.id);

        const embed = new MessageEmbed()
          .setTitle('💣✨ BOM Oyunu Hazır!')
          .setDescription(
            `🎮 Oyun kanalı oluşturuldu: <#${channel.id}>\n\n➡️ **Kurallar:**\n1️⃣ 1’den başlayarak sırayla sayın\n5️⃣ her 5’in katında **BOM** yazın\n❌ Yanlış yapanın mesajı silinir`
          )
          .setColor('#FF3366')
          .setThumbnail('https://i.imgur.com/0y8Ftya.gif') // anime-style icon
          .setFooter({
            text: 'BOM Oyunu • Eğlenmeye Başla!',
            iconURL: client.user.displayAvatarURL(),
          })
          .setTimestamp();

        return message.channel.send({ embeds: [embed] });
      } catch (e) {
        console.error(e);
        return message.reply('❌ BOM kanalı oluşturulamadı!');
      }
    } else if (type === 'sil') {
      const channelId = await db.get(`bom_${guild.id}`);
      if (!channelId) return message.reply('❌ BOM kanalı zaten yok!');

      const channel = guild.channels.cache.get(channelId);
      if (channel) await channel.delete('BOM oyunu silindi');

      await db.delete(`bom_${guild.id}`);
      return message.reply('💣 BOM kanalı silindi!');
    }
  }

  // --- KELİME işlemleri ---
  if (action === 'kelime') {
    if (type === 'oluştur') {
      try {
        const existing = await db.get(`kelime_${guild.id}`);
        if (existing) return message.reply('⭐ KELİME kanalı zaten mevcut!');

        const channel = await guild.channels.create('⭐┃ＫＥＬＩＭＥ', {
          type: 'GUILD_TEXT',
          reason: 'Oyun KELİME kanalı oluşturuldu',
          topic:
            '⭐ Kelime Oyunu — Geçerli kelimelerle oynayın, son harfe göre devam edin! ✨',
        });

        await db.set(`kelime_${guild.id}`, channel.id);

        const embed = new MessageEmbed()
          .setTitle('⭐🌸 Kelime Oyunu Hazır!')
          .setDescription(
            `📖 Oyun kanalı oluşturuldu: <#${channel.id}>\n\n➡️ **Kurallar:**\n✨ Sadece geçerli Türkçe kelimeler yazılır\n🔠 Yeni kelime, önceki kelimenin **son harfi** ile başlamalı\n❌ Yanlış yapanın mesajı silinir`
          )
          .setColor('#55FFAA')
          .setThumbnail('https://i.imgur.com/0y8Ftya.gif') // anime-style icon
          .setFooter({
            text: 'Kelime Oyunu • En yaratıcı kelimeyi bul!',
            iconURL: client.user.displayAvatarURL(),
          })
          .setTimestamp();

        return message.channel.send({ embeds: [embed] });
      } catch (e) {
        console.error(e);
        return message.reply('❌ KELİME kanalı oluşturulamadı!');
      }
    } else if (type === 'sil') {
      const channelId = await db.get(`kelime_${guild.id}`);
      if (!channelId) return message.reply('❌ KELİME kanalı zaten yok!');

      const channel = guild.channels.cache.get(channelId);
      if (channel) await channel.delete('KELİME oyunu silindi');

      await db.delete(`kelime_${guild.id}`);
      return message.reply('⭐ KELİME kanalı silindi!');
    }
  }
};

module.exports.help = {
  name: 'oyun',
  description: '💥 BOM ve KELİME oyun kanallarını oluşturur veya siler',
  usage: 'oyun bom oluştur | oyun kelime sil',
  category: 'Eğlence',
  cooldown: 5,
  permissions: ['MANAGE_CHANNELS'],
};
