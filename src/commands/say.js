const emojis = require("../emoji.json");

exports.execute = async (client, message, args) => {
  try {
    if (!Array.isArray(client.config?.admins) || !client.config.admins.includes(message.author.id)) {
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, üzgünüm ama bu komutu kullanma yetkin yok~ :c`
      );
    }

    let rawText = message.content.replace(/^\s*\S+/, "");
    if (rawText.startsWith(" ")) rawText = rawText.slice(1);

    if (!rawText || rawText.length === 0) {
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, lütfen bir mesaj yaz~ boş mesaj gönderemezsin :c`
      );
    }

    const sayMessage = rawText.replace(/\((\d+)\)/g, (match, emojiID) => {
      if (!message.guild) return match;
      const emoji = message.guild.emojis.cache.get(emojiID);
      return emoji ? emoji.toString() : match;
    });

    try {
      await message.delete();
    } catch (err) {
      console.warn("Mesaj silinemedi:", err?.message ?? err);
    }

    await message.channel.send({
      content: sayMessage,
      allowedMentions: { parse: ["users", "roles", "everyone"] },
    });

    return message.channel.send(
      `${emojis.bot.succes} | **${message.member.displayName}**, mesajın başarıyla gönderildi! ✨`
    );
  } catch (error) {
    console.error("say komutunda hata:", error);
    return message.reply(
      `${emojis.bot.error} | **${message.member.displayName}**, uf! Mesaj gönderilirken bir sorun çıktı~ tekrar dene :c`
    );
  }
};

exports.help = {
  name: "say",
  aliases: [],
  usage: "say <mesaj>",
  description:
    "Belirtilen mesajı sunucuda yayınlar. Enterler, boşluklar ve etiketler korunur. (Özel emoji: (id) formatı desteklenir.)",
  category: "Bot",
  cooldown: 5,
  admin: true,
};
