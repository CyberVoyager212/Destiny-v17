const emojis = require("../emoji.json");

exports.execute = async (client, message, args) => {
  try {
    if (!message.member.permissions.has("MANAGE_CHANNELS")) {
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, üzgünüm ama bunu yapmak için gerekli yetkiye sahip değilsin~ :c`
      );
    }

    const member = message.mentions.members.first();
    if (!member) {
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, lütfen mesaj göndermek istediğin kullanıcıyı etiketle~ :c`
      );
    }

    const messageContent = args.slice(1).join(" ");
    if (!messageContent) {
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, göndermek istediğin mesajı yazmayı unuttun~ ✍️`
      );
    }

    await member
      .send(`${messageContent}`)
      .then(() =>
        message.channel.send(
          `${emojis.bot.succes} | **${message.member.displayName}**, mesaj başarıyla **${member.user.tag}** kullanıcısına gönderildi! ✨`
        )
      )
      .catch((error) => {
        console.error("❌ | Mesaj gönderme hatası:", error);
        message.reply(
          `${emojis.bot.error} | **${message.member.displayName}**, kullanıcıya DM gönderilemedi~ DM kutusu kapalı olabilir :c`
        );
      });
  } catch (error) {
    console.error("⚠️ | Komut çalıştırılırken hata oluştu:", error);
    return message.reply(
      `${emojis.bot.error} | **${message.member.displayName}**, uf! Mesaj gönderilirken bir sorun çıktı~ tekrar dene :c`
    );
  }
};

exports.help = {
  name: "sendmessage",
  aliases: ["sms"],
  usage: "sendmessage <@kullanıcı> <mesaj>",
  description: "Bir kullanıcıya özel mesaj gönderir.",
  category: "Moderasyon",
  cooldown: 10,
  permissions: ["MANAGE_CHANNELS"],
};
