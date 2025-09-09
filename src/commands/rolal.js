const { MessageEmbed } = require("discord.js");
const emojis = require("../emoji.json");

exports.help = {
  name: "rolal",
  aliases: [],
  usage: "rolal <@kullanıcı> <@rol|id|isim> [başka_rol...]",
  description: "Kullanıcıdan bir veya birden fazla rol alır.",
  category: "Moderasyon",
  cooldown: 5,
  permissions: ["MANAGE_ROLES"],
};

exports.execute = async (client, message, args) => {
  if (!message.member.permissions.has("MANAGE_ROLES")) {
    return message.reply(
      `${emojis.bot.error} | **${message.member.displayName}**, üzgünüm ama bunu yapmak için \`Rolleri Yönet\` yetkisine sahip olmalısın~ :c`
    );
  }

  const member = message.mentions.members.first();
  if (!member) {
    return message.reply(
      `${emojis.bot.error} | **${message.member.displayName}**, rolü alınacak kullanıcıyı etiketlemelisin~ :c`
    );
  }

  const roles = args
    .slice(1)
    .map(
      (r) =>
        message.guild.roles.cache.get(r) ||
        message.guild.roles.cache.find((x) => x.name === r) ||
        message.mentions.roles.first()
    )
    .filter(Boolean);

  if (!roles.length) {
    return message.reply(
      `${emojis.bot.error} | **${message.member.displayName}**, alınacak rolleri belirtmelisin~`
    );
  }

  const removed = [];
  const failed = [];

  for (const rol of roles) {
    try {
      if (member.roles.cache.has(rol.id)) {
        await member.roles.remove(rol);
        removed.push(rol.name);
      } else {
        failed.push(rol.name);
      }
    } catch (e) {
      console.error(e);
      failed.push(rol.name);
    }
  }

  if (!removed.length) {
    return message.channel.send(
      `${emojis.bot.error} | **${message.member.displayName}**, ${member.user.tag} kullanıcısından alınabilecek bir rol bulunamadı veya yetkim yetersiz~ :c`
    );
  }

  const embed = new MessageEmbed()
    .setDescription(
      `${emojis.bot.succes} | **${message.member.displayName}**, başarıyla ${member.user.tag} kullanıcısından alındı: ${removed.join(", ")}${
        failed.length ? `\n⚠️ Alınamayan roller: ${failed.join(", ")}` : ""
      }`
    )
    .setColor("#FF0000")
    .setTimestamp();

  message.channel.send({ embeds: [embed] });
};
