// commands/webhookat.js
const emojis = require('../emoji.json');

exports.help = {
  name: 'webhookat',
  aliases: ['whsend', 'whisper'],
  usage: 'webhookat <mesaj>',
  description: 'Webhook oluşturup anonim olarak belirtilen mesajı gönderir.',
  category: 'Moderasyon',
  cooldown: 5,
  permissions: ['MANAGE_WEBHOOKS'],
};

exports.execute = async (client, message, args) => {
  try {
    // Kullanıcı izni kontrolü
    if (!message.member || !message.member.permissions.has('MANAGE_WEBHOOKS')) {
      return message.reply(
        `${emojis.bot.error} | **${
          message.member?.displayName || message.author.username
        }**, bu komutu kullanmak için \`Webhookları Yönet\` yetkisine sahip olmalısın qwq~`
      );
    }

    // Bot izni kontrolü
    if (!message.guild.me.permissions.has('MANAGE_WEBHOOKS')) {
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, bana \`Webhookları Yönet\` izni verilmemiş :c`
      );
    }

    // raw metni al (komutu ve prefix'i silerek), satır sonlarını korur
    let rawText = message.content.replace(/^\s*\S+/, '').replace(/^\s*/, '');

    if (!rawText || rawText.length === 0) {
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, lütfen gönderilecek mesajı yaz: \`webhookat <mesaj>\` owo`
      );
    }

    // Komut içeren mesajı gizlemek için kısa bir süre sonra sil
    setTimeout(() => {
      message.delete().catch(() => {});
    }, 500);

    // Kanalda önceden oluşturulmuş webhook var mı kontrol et
    const webhooks = await message.channel.fetchWebhooks();
    let webhook = webhooks.find((w) => w.name === 'WebhookAtBot');

    if (!webhook) {
      try {
        webhook = await message.channel.createWebhook('WebhookAtBot', {
          avatar: 'https://i.imgur.com/0TeacfY.png',
        });
      } catch (err) {
        console.error('Webhook oluşturma hatası:', err);
        return message.channel.send(
          `${emojis.bot.error} | **${message.member.displayName}**, webhook oluşturulamadı qwq~ \n> Hata: \`${err.message}\``
        );
      }
    }

    // Webhook üzerinden mesaj gönder
    await webhook.send({
      content: rawText,
      username: 'Void Whisperer',
      avatarURL: 'https://i.imgur.com/0TeacfY.png',
      allowedMentions: { parse: ['users', 'roles', 'everyone'] },
    });

    // Başarılı işlem bildirimi (kısa süreli)
    const okMsg = await message.channel.send(
      `${emojis.bot.succes} | **${message.member.displayName}**, message sent anonymously~`
    );
    setTimeout(() => okMsg.delete().catch(() => {}), 4000);
  } catch (err) {
    console.error('webhookat hatası:', err);
    return message.channel.send(
      `${emojis.bot.error} | **${message.member.displayName}**, webhook mesajı gönderilirken bir hata oluştu qwq~ \n> Hata: \`${err.message}\``
    );
  }
};
