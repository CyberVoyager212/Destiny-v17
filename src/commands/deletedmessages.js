const { MessageAttachment } = require("discord.js"); // v13 için
const botConfig = require("../botConfig.js");
const emojis = require("../emoji.json");

module.exports = {
  name: "deletedmessages",
  description:
    "Son silinen mesajları silinme saatleriyle gösterir veya belirli kayıtları silebilirsiniz.",
  aliases: ["dmsgs", "deletemsgs"],
  usage: "deletedmessages | dmsgs sil <kullanıcı> [saat] | dmsgs indir",
  permissions: ["MANAGE_MESSAGES"],

  async execute(client, message, args) {
    if (!message.guild)
      return message.reply(
        `${emojis.bot.error} | Aa~ bu komut sadece sunucularda kullanılabilir, **${message.member.displayName}** :c`
      );

    let guildKey = `deletedMessages_${message.guild.id}`;
    let deletedMessages = (await client.db.get(guildKey)) || [];

    if (!deletedMessages.length)
      return message.reply(
        `${emojis.bot.error} | Hımm~ hiç silinen mesaj bulunamadı, **${message.member.displayName}**!`
      );

    // "sil" argümanı
    if (args[0] && args[0].toLowerCase() === "sil") {
      if (!botConfig.admins.includes(message.author.id)) {
        return message.reply(
          `${emojis.bot.error} | Üzgünüm, **${message.member.displayName}**, bu komutu kullanma yetkin yok~`
        );
      }

      let username = args[1];
      let time = args[2];

      if (!username && !time) {
        return message.reply(
          `${emojis.bot.error} | Silmek için en az bir kriter belirtmelisin~ (Kullanıcı adı veya saat)`
        );
      }

      let newDeletedMessages = deletedMessages.filter((msg) => {
        let matchUser = username ? msg.includes(`**${username}**`) : true;
        let matchTime = time ? msg.startsWith(`[${time}]`) : true;
        return !(matchUser && matchTime);
      });

      if (newDeletedMessages.length === deletedMessages.length) {
        return message.reply(
          `${emojis.bot.error} | Hımm~ belirtilen kriterlere uygun silinen mesaj bulunamadı 😵`
        );
      }

      await client.db.set(guildKey, newDeletedMessages);
      return message.reply(
        `${emojis.bot.succes} | Belirtilen silinen mesaj(lar) başarıyla kaldırıldı! 🎉`
      );
    }

    // "indir" argümanı
    if (args[0] && args[0].toLowerCase() === "indir") {
      const fileContent = deletedMessages.join("\n");
      const buffer = Buffer.from(fileContent, "utf-8");
      const attachment = new MessageAttachment(buffer, "deletedMessages.txt");

      return message.channel.send({
        content: `${emojis.bot.succes} | İşte tüm silinen mesajlar, **${message.member.displayName}**~`,
        files: [attachment],
      });
    }

    // 2000 karakter sınırı için
    while (
      deletedMessages.length > 0 &&
      deletedMessages.join("\n").length > 2000
    ) {
      let longestMessageIndex = deletedMessages.reduce(
        (maxIndex, msg, index, arr) =>
          msg.length > arr[maxIndex].length ? index : maxIndex,
        0
      );
      deletedMessages.splice(longestMessageIndex, 1);
    }

    if (deletedMessages.length === 0)
      return message.reply(
        `${emojis.bot.error} | Hımm~ son silinen mesajlar artık çok uzun olduğu için gösterilemiyor 😵`
      );

    message.channel.send({
      content: `${emojis.bot.succes} | İşte son silinen mesajlar, **${message.member.displayName}**~\n\n${deletedMessages.join(
        "\n"
      )}`,
    });
  },

  help: {
    name: "deletedmessages",
    aliases: ["dmsgs", "deletemsgs"],
    usage: "deletedmessages | dmsgs sil <kullanıcı> [saat] | dmsgs indir",
    description:
      "Son silinen mesajları embed olmadan, silinme saatleriyle birlikte gösterir ve dilersen indirmeni sağlar.",
    category: "Moderasyon",
    cooldown: 3,
    permissions: ["MANAGE_MESSAGES"],
  },
};
