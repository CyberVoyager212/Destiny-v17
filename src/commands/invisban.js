const { MessageEmbed } = require("discord.js");
const emojis = require("../emoji.json");

module.exports = {
  name: "invisban",
  description:
    'Kullanıcının tüm rollerini alır ve "Yasaklı" rolü vererek onu görünmez şekilde yasaklar.',
  aliases: ["gizliban", "silentban"],
  usage: "invisban <@kullanıcı | kullanıcı ID | kullanıcı adı> <sebep>",
  category: "Moderasyon",
  cooldown: 5,
  permissions: ["MANAGE_ROLES"],

  async execute(client, message, args) {
    if (!message.member.permissions.has("MANAGE_ROLES"))
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, bu komutu kullanmaya yeteneğin yetmiyor... üzgünüm~ >///<`
      );

    if (!args[0])
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, kimi yasaklayacağımı söylemedin... lütfen birini etiketle ya da ID yaz~ :c`
      );

    let user =
      message.mentions.members.first() ||
      message.guild.members.cache.get(args[0]) ||
      message.guild.members.cache.find(
        (m) => m.user.username.toLowerCase() === args[0].toLowerCase()
      );

    if (!user)
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, aradığın kişiyi bulamadım... doğru yazdığından emin misin? >~<`
      );

    let reason = args.slice(1).join(" ") || "Sebep belirtilmedi";

    let banRole = message.guild.roles.cache.find((r) => r.name === "Yasaklı");

    if (!banRole) {
      try {
        banRole = await message.guild.roles.create({
          name: "Yasaklı",
          color: "BLACK",
          permissions: [],
        });

        message.guild.channels.cache.forEach(async (channel) => {
          await channel.permissionOverwrites.create(banRole, {
            SEND_MESSAGES: false,
            CONNECT: false,
          });
        });
      } catch (err) {
        return message.reply(
          `${emojis.bot.error} | **${message.member.displayName}**, "Yasaklı" rolünü oluştururken bir şeyler ters gitti... sanki elimden kayıp gitti >///<`
        );
      }
    }

    try {
      await user.roles.set([banRole]);
      message.channel.send(
        `${emojis.bot.succes} | **${user.user.tag}** görünmez şekilde yasaklandı! ✨ **Sebep:** ${reason}`
      );
    } catch (err) {
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, kullanıcının rollerini değiştirmeye gücüm yetmiyor... yardım et~ :c`
      );
    }
  },

  help: {
    name: "invisban",
    aliases: ["gizliban", "silentban"],
    usage: "invisban <@kullanıcı | kullanıcı ID | kullanıcı adı> <sebep>",
    description:
      'Kullanıcının tüm rollerini alır ve "Yasaklı" rolü vererek onu görünmez şekilde yasaklar.',
    category: "Moderasyon",
    cooldown: 5,
    permissions: ["MANAGE_ROLES"],
  },
};
