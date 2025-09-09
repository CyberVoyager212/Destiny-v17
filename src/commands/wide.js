const emojis = require("../emoji.json"); // emoji.json içe aktarılır

module.exports = {
  config: {
    name: "wideavatar",
    description: "Bir kullanıcının avatarını genişletilmiş olarak gönderir.",
  },

  execute: async (client, message, args) => {
    try {
      const mention = message.mentions.members.first() || message.member;
      const avatar = mention.user.displayAvatarURL({
        dynamic: true,
        size: 2048,
        format: "png",
      });

      await message.channel.send({
        content: `${emojis.bot.succes} | **${message.member.displayName}**, işte genişletilmiş avatar ~ ✨`,
        files: [
          {
            attachment: `https://vacefron.nl/api/wide?image=${avatar}`,
            name: "wideavatar.png",
          },
        ],
      });
    } catch (err) {
      console.error("wideavatar hata:", err);
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, avatar genişletilirken bir şeyler ters gitti qwq~ \n> Hata: \`${err?.message || "Bilinmeyen hata"}\``
      );
    }
  },

  help: {
    name: "wideavatar",
    description: "Bir kullanıcının avatarını genişletilmiş olarak gönderir.",
    usage: "wideavatar [@kullanıcı] (isteğe bağlı)",
    aliases: ["wa"],
    category: "Eğlence",
    cooldown: 5,
  },
};
