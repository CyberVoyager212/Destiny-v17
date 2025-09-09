const emojis = require("../emoji.json");

exports.help = {
  name: "kanal",
  aliases: [],
  usage: "kanal gizle | kanal aç",
  description: "Kanalı yönetici olmayanlar için gizler ya da görünür yapar.",
  category: "Moderasyon",
  cooldown: 5,
  permissions: ["MANAGE_CHANNELS"],
};

exports.execute = async (client, message, args) => {
  try {
    if (!message.member.permissions.has("MANAGE_CHANNELS")) {
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, bu büyüyü yapmak için yeterli güce sahip değilsin~ :c`
      );
    }

    const sub = args[0]?.toLowerCase();
    const channel = message.channel;

    if (!sub || !["gizle", "aç"].includes(sub)) {
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, hmm... yanlış kelimeler kullandın~ >w<\nDoğru kullanım: \`kanal gizle\` veya \`kanal aç\``
      );
    }

    const everyone = message.guild.roles.everyone;

    if (sub === "gizle") {
      await channel.permissionOverwrites.edit(everyone, {
        VIEW_CHANNEL: false,
      });
      return message.channel.send(
        `${emojis.bot.succes} | **${message.member.displayName}**, kanal başarıyla görünmez hale getirildi~ 🔒`
      );
    }

    if (sub === "aç") {
      await channel.permissionOverwrites.edit(everyone, {
        VIEW_CHANNEL: true,
      });
      return message.channel.send(
        `${emojis.bot.succes} | **${message.member.displayName}**, kanal artık tekrar görünür hale geldi~ 🔓`
      );
    }
  } catch (error) {
    console.error("⚠️ kanal komutu hata:", error);
    return message.reply(
      `${emojis.bot.error} | **${message.member.displayName}**, ahh... bir hata oluştu~ sistemim biraz şaşırdı >.< \nLütfen tekrar dene, olur mu?`
    );
  }
};
