const { MessageEmbed } = require('discord.js');

module.exports = {
  help: {
    name: 'privateses',
    aliases: ['ozel-ses', 'privatevoice'],
    usage: 'privateses setup <hub-kanal-ismi> [kategori-ismi]',
    description:
      'Özel ses kanalı sistemi kurulumu (kategori + hub kanal oluşturur). Hub kanalına giren kullanıcı için özel oda oluşturulur.',
    category: 'Moderasyon',
    cooldown: 5,
    permissions: ['MANAGE_CHANNELS'],
  },

  execute: async (client, message, args) => {
    if (
      !message.member.permissions.has('MANAGE_GUILD') &&
      !message.member.permissions.has('MANAGE_CHANNELS')
    ) {
      return message.reply(
        `${message.author}, bu komutu kullanmak için \`Manage Channels\` veya \`Manage Guild\` yetkisine sahip olmalısın.`
      );
    }

    const sub = args[0];
    if (!sub || sub !== 'setup') {
      return message.channel.send(
        'Kullanım: `!privateses setup <hub-kanal-ismi> [kategori-ismi]`'
      );
    }

    const hubName = args[1] || '➕ Özel Oda Oluştur';
    const categoryName = args.slice(2).join(' ') || 'Özel Ses Odaları';
    const guild = message.guild;

    // Kategori oluştur / varsa al
    // Discord.js v13'te channel.type için "GUILD_CATEGORY" kullanmak güvenlidir.
    let category = guild.channels.cache.find(
      (c) =>
        (c.type === 'GUILD_CATEGORY' || c.type === 'category') &&
        c.name === categoryName
    );

    if (!category) {
      try {
        category = await guild.channels.create(categoryName, {
          type: 'GUILD_CATEGORY',
          reason: 'Özel ses sistemi kategori oluşturma',
        });
      } catch (e) {
        return message.channel.send(`Kategori oluşturulamadı: ${e.message}`);
      }
    }

    // Hub voice oluştur / varsa al (aynı parent içinde)
    // parentId kontrolü v13'te 'parentId' şeklinde erişilir (küçük d).
    let hub = guild.channels.cache.find(
      (c) =>
        (c.type === 'GUILD_VOICE' || c.type === 'voice') &&
        c.name === hubName &&
        c.parentId === category.id
    );

    if (!hub) {
      try {
        hub = await guild.channels.create(hubName, {
          type: 'GUILD_VOICE',
          parent: category.id,
          permissionOverwrites: [
            { id: guild.roles.everyone.id, allow: ['CONNECT', 'VIEW_CHANNEL'] },
          ],
          reason: 'Özel ses sistemi hub kanalı',
        });
      } catch (e) {
        // Hata detayını döndür (ör. parent id yanlış tipte ise burada yakalanır)
        return message.channel.send(`Hub kanal oluşturulamadı: ${e.message}`);
      }
    }

    // DB'ye kaydet
    try {
      await client.db.set(`privateses_${guild.id}`, {
        categoryId: category.id,
        hubId: hub.id,
      });
    } catch (e) {
      return message.channel.send(`DB'ye kaydetme hatası: ${e.message}`);
    }

    const embed = new MessageEmbed()
      .setTitle('Özel Ses Sistemi Kuruldu')
      .setDescription(
        `Kategori: **${category.name}**\nHub: **${hub.name}**\n\nHub kanalına giren kullanıcı için otomatik özel oda oluşturulacaktır.`
      )
      .setColor('#2f3136');

    return message.channel.send({ embeds: [embed] });
  },
};
