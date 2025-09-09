const emojis = require('../emoji.json');

exports.execute = async (client, message, args) => {
  if (!message.member.permissions.has('MANAGE_MESSAGES')) {
    return message.reply(`${emojis.bot.error} |  **${message.member.displayName}**, bu komutu kullanmak için ` + "`Mesajları Yönet`" + ` yetkisine sahip olmalısın!`);
  }

  if (
    args.length < 3 ||
    !['kullanıcı', 'rol'].includes(args[0]?.toLowerCase()) ||
    !['kapat', 'aç'].includes(args[args.length - 1]?.toLowerCase())
  ) {
    return message.reply(`${emojis.bot.error} | **${message.member.displayName}**, geçersiz kullanım!
Örnekler:
` + "`etiket kullanıcı @kullanıcı kapat`" + `
` + "`etiket rol @rol aç`" );
  }

  const targetType = args[0].toLowerCase();
  const action = args[args.length - 1].toLowerCase();

  let target =
    message.mentions.members.first() ||
    message.guild.members.cache.get(args[1]) ||
    message.guild.roles.cache.get(args[1]) ||
    message.mentions.roles.first();

  if (!target) {
    return message.reply(`${emojis.bot.error} | **${message.member.displayName}**, lütfen bir kullanıcı veya rol etiketle veya ID gir!`);
  }

  try {
    const guildId = message.guild.id;
    const targetId = target.id;

    if (action === 'aç') {
      await client.db.delete(`etiketYasak_${guildId}_${targetId}`);
      return message.channel.send(`${emojis.bot.succes} |  **Etiketleme açıldı!**\n📌 ${targetType === 'kullanıcı' ? target.toString() : target.name} artık etiketlenebilir.`);
    } else if (action === 'kapat') {
      await client.db.set(`etiketYasak_${guildId}_${targetId}`, true);
      return message.channel.send(`${emojis.bot.succes} |  **Etiketleme kapatıldı!**\n📌 ${targetType === 'kullanıcı' ? target.toString() : target.name} artık etiketlenemez.`);
    } else {
      return message.reply(`${emojis.bot.error} |  **${message.member.displayName}**, bilinmeyen işlem türü: \`${action}\`. Lütfen 'aç' veya 'kapat' kullanın.`);
    }
  } catch (error) {
    console.error('⚠️ | Etiketleme işleminde hata:', error);
    return message.reply(`${emojis.bot.error}  **${message.member.displayName}**, işlem sırasında beklenmedik bir hata oluştu!
Hata: \`${error.message || error}\`
Lütfen daha sonra tekrar dene veya sunucu sahibine başvur.`);
  }
};

exports.help = {
  name: 'etiket-yasakla',
  aliases: ['etiket'],
  usage: 'etiket-yasakla kullanıcı/rol @kullanıcı/@rol kapat/aç',
  description: 'Belirli kullanıcılar veya roller için etiket yasaklamayı açar veya kapatır.',
  category: 'Moderasyon',
  cooldown: 5,
  permissions: ['MANAGE_MESSAGES'],
};
