// addegis.js
const { MessageEmbed } = require("discord.js");
const emojis = require("../emoji.json");

exports.help = {
  name: "addeğiş",
  aliases: [],
  usage: "addeğiş <@kullanıcı> <yeni İsim>",
  description: "Belirtilen kullanıcının sunucu üzerindeki adını değiştirir.",
  category: "Moderasyon",
  cooldown: 5,
  permissions: ["MANAGE_NICKNAMES"],
};

exports.execute = async (client, message, args) => {
  if (!message.member.permissions.has("MANAGE_NICKNAMES"))
    return message.reply(
      `${emojis.bot.error} | **${message.member.displayName}**, İsimleri değiştirmek için yetkin yok~ :c`
    );

  if (!message.guild.me.permissions.has("MANAGE_NICKNAMES"))
    return message.reply(
      `${emojis.bot.error} | **${message.member.displayName}**, Benim yetkim yetmiyor uwu`
    );

  const member = message.mentions.members.first();
  const yeni = args.slice(1).join(" ");

  if (!member || !yeni)
    return message.reply(
      `${emojis.bot.error} | **${message.member.displayName}**, Kullanıcı ve yeni isim girmelisin >w<`
    );

  if (member.id === message.guild.ownerId)
    return message.reply(
      `${emojis.bot.error} | **${message.member.displayName}**, Sunucu sahibinin ismini değiştiremem :c`
    );

  if (member.roles.highest.position >= message.guild.me.roles.highest.position)
    return message.reply(
      `${emojis.bot.error} | **${message.member.displayName}**, Bu kullanıcının rolü benden yüksek q-q`
    );

  try {
    await member.setNickname(yeni);
    message.channel.send(
      `${emojis.bot.succes} | **${member.displayName}** artık **${yeni}**! Yay~`
    );
  } catch (e) {
    console.error(e);
    message.reply(
      `${emojis.bot.error} | **${message.member.displayName}**, İsim değiştirme sırasında hata çıktı :c`
    );
  }
};
