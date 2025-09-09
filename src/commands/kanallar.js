const emojis = require("../emoji.json");

module.exports = {
  async execute(client, message, args) {
    try {
      if (!message.member.permissions.has("VIEW_CHANNEL")) {
        return message.reply(
          `${emojis.bot.error} | **${message.member.displayName}**, bu dünyaya göz atmak için gerekli iznin yok~ :c`
        );
      }

      const channels = message.guild.channels.cache
        .map(
          (channel) =>
            `📌 ${channel.name} (\`${channel.id}\`) [${channel.type}]`
        )
        .join("\n");

      if (!channels) {
        return message.reply(
          `${emojis.bot.error} | **${message.member.displayName}**, bu sunucuda hiç kanal bulamadım... tuhaf değil mi? >.<`
        );
      }

      if (channels.length > 2000) {
        const chunks = channels.match(/[\s\S]{1,2000}/g);
        for (const chunk of chunks) {
          await message.channel.send(
            `${emojis.bot.succes} | **${message.member.displayName}**, işte kanallar listesi~ ✨\n${chunk}`
          );
        }
      } else {
        message.channel.send(
          `${emojis.bot.succes} | **${message.member.displayName}**, işte kanallar listesi~ ✨\n${channels}`
        );
      }
    } catch (error) {
      console.error("⚠️ kanallar komutu hata:", error);
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, ahh~ kanalları listelerken bir sorun çıktı... sistemim biraz kafası karıştı >w< \nLütfen tekrar dene, olur mu?`
      );
    }
  },

  help: {
    name: "kanallar",
    aliases: ["channels", "sunucu-kanallar"],
    usage: "kanallar",
    description: "Sunucudaki tüm kanalları listeler.",
    category: "Moderasyon",
    cooldown: 5,
    permissions: ["VIEW_CHANNEL"],
  },
};
