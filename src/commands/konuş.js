const { Message } = require("discord.js");
const botConfig = require("../botConfig");
const emojis = require("../emoji.json");

exports.execute = async (client, message, args) => {
  try {
    if (!Array.isArray(botConfig.admins) || !botConfig.admins.includes(message.author.id)) {
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, hmmm... yetkin yok gibi gözüküyor~ bana göre çok hızlısın :c`
      );
    }

    const targetUser = message.mentions?.members?.first();
    if (!targetUser) {
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, lütfen taklit edilecek kullanıcıyı etiketle! >///<`
      );
    }

    // Mesaj içeriğini al
    const mentionString = targetUser.toString();
    const mentionIndex = message.content.indexOf(mentionString);
    let rawText = mentionIndex !== -1 
      ? message.content.slice(mentionIndex + mentionString.length)
      : message.content.replace(/^\s*\S+\s+\S+/, "");

    const text = rawText.replace(/^\s*/, "");
    if (!text || text.length === 0) {
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, mesajı yazmayı unutmuşsun gibi~ qwq`
      );
    }

    try { await message.delete(); } catch {}

    // Webhook oluştur / mevcut webhook'u al
    const webhooks = await message.channel.fetchWebhooks();
    let webhook = webhooks.find((wh) => wh.name === "Webhook");
    if (!webhook) {
      webhook = await message.channel.createWebhook("Webhook", {
        avatar: client.user.displayAvatarURL(),
      });
    }

    const displayName = targetUser.displayName || targetUser.user.username;

    await webhook.send({
      content: text,
      username: displayName,
      avatarURL: targetUser.user.displayAvatarURL({ dynamic: true }),
      allowedMentions: { parse: [] },
    });

  } catch (error) {
    console.error("Konuş Komutu Hatası:", error);
    return message.reply(
      `${emojis.bot.error} | Huuu~ bir hata oluştu **${message.member.displayName}** :c Lütfen tekrar dene!`
    );
  }
};

exports.help = {
  name: "konuş",
  aliases: ["konustur"],
  usage: "konuş @kullanıcı mesaj",
  description:
    "Belirtilen kullanıcı adına mesaj gönderir (sunucudaki takma ad kullanılacak). Enterler korunur.",
  category: "Moderasyon",
  cooldown: 5,
  admin: true,
};
