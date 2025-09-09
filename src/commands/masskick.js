const { Permissions } = require("discord.js");
const emojis = require("../emoji.json");

module.exports = {
  name: "masskick",
  description: "Belirtilen kullanıcıları toplu olarak sunucudan atar.",
  aliases: ["mkick", "masskickhammer"],
  usage: "masskick @user1 @user2 ...",

  async execute(client, message, args) {
    if (!message.member.permissions.has(Permissions.FLAGS.KICK_MEMBERS)) {
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, üzgünüm ama bu komutu kullanacak kadar güçlü değilsin... qwq`
      );
    }

    if (!message.guild.me.permissions.has(Permissions.FLAGS.KICK_MEMBERS)) {
      return message.reply(
        `${emojis.bot.error} | Auw~ benim de **Üyeleri At** iznim yok... Ne kadar uğraşsam da yapamam :c`
      );
    }

    const users = message.mentions.members;
    if (!users.size) {
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, kimi atmam gerektiğini söylemezsen öylece bakakalırım... :<`
      );
    }

    let success = 0,
      failed = 0;

    for (const [, member] of users) {
      try {
        await member.kick(
          `Toplu Atma - Yetkili: ${message.member.displayName}`
        );
        success++;
      } catch (error) {
        failed++;
      }
    }

    return message.channel.send(
      `${emojis.bot.succes} | **${message.member.displayName}**, işlem tamamlandı!\n` +
        `👢 **Başarıyla atılanlar:** ${success} kişi\n` +
        `${emojis.bot.error} **Başarısız olanlar:** ${failed} kişi ~ biraz huysuz çıktılar sanırım :c`
    );
  },

  help: {
    name: "masskick",
    aliases: ["mkick", "masskickhammer"],
    usage: "masskick @user1 @user2 ...",
    description: "Belirtilen kişileri topluca sunucudan atar.",
    category: "Moderasyon",
    cooldown: 10,
    permissions: ["KICK_MEMBERS"],
  },
};
