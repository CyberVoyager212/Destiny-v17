const emojis = require("../emoji.json");

exports.execute = async (client, message, args) => {
  try {
    if (!message.member.permissions.has("MANAGE_CHANNELS"))
      return message.reply(`${emojis.bot.error} | **${message.member.displayName}**, bunun için \`Kanalları Yönet\` yetkin yok~ :c`);

    if (!message.guild.me.permissions.has("MANAGE_CHANNELS"))
      return message.reply(`${emojis.bot.error} | **${message.member.displayName}**, botun \`Kanalları Yönet\` yetkisi yok~ :c`);

    const time = parseInt(args[0]);
    if (isNaN(time) || time < 0 || time > 21600)
      return message.reply(`${emojis.bot.error} | Lütfen 0-21600 saniye arasında bir sayı gir~ ⏱`);

    await message.channel.setRateLimitPerUser(time);

    return message.channel.send(
      time === 0
        ? `${emojis.bot.succes} | **${message.member.displayName}**, yavaş mod kapatıldı~ ✨`
        : `${emojis.bot.succes} | **${message.member.displayName}**, yavaş mod ${time} saniye olarak ayarlandı~ ✨`
    );
  } catch (error) {
    console.error(error);
    return message.reply(`${emojis.bot.error} | **${message.member.displayName}**, bir hata oluştu~ tekrar dene :c`);
  }
};

exports.help = {
  name: "slowmode",
  aliases: ["yavaşmod", "slow"],
  usage: "slowmode <saniye>",
  description: "Belirtilen kanal için yavaş modu ayarlar (0 kapatır).",
  category: "Moderasyon",
  cooldown: 5,
  permissions: ["MANAGE_CHANNELS"],
};
