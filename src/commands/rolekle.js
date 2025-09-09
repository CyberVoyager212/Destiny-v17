const { MessageEmbed } = require("discord.js");
const emojis = require("../emoji.json");

exports.help = {
  name: "rolekle",
  aliases: [],
  usage: "rolekle <@kullanıcı> <@rol|id|isim> [başka_rol...]",
  description: "Kullanıcıya bir veya birden fazla rol verir.",
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
      `${emojis.bot.error} | **${message.member.displayName}**, rol verilecek kullanıcıyı belirtmelisin~ :c`
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
      `${emojis.bot.error} | **${message.member.displayName}**, verilecek rolleri belirtmelisin~ :c`
    );
  }

  const added = [];
  for (const rol of roles) {
    try {
      if (!member.roles.cache.has(rol.id)) {
        await member.roles.add(rol);
        added.push(rol.name);
      }
    } catch (e) {
      console.error(e);
    }
  }

  if (!added.length) {
    return message.channel.send(
      `${emojis.bot.error} | **${message.member.displayName}**, ${member.user.tag} kullanıcısına eklenebilecek bir rol bulunamadı veya yetkim yetersiz~ :c`
    );
  }

  const embed = new MessageEmbed()
    .setDescription(
      `${emojis.bot.succes} | **${message.member.displayName}**, başarıyla ${member.user.tag} kullanıcısına eklendi: ${added.join(
        ", "
      )} ✨`
    )
    .setColor("#00FF00")
    .setTimestamp();

  message.channel.send({ embeds: [embed] });
};
