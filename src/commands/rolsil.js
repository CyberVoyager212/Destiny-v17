const { MessageEmbed } = require("discord.js");
const emojis = require("../emoji.json");

exports.help = {
  name: "rolsil",
  aliases: [],
  usage: "rolsil <@rol|id|isim> [başka_rol...]",
  description: "Belirtilen rolleri siler.",
  category: "Moderasyon",
  cooldown: 5,
  permissions: ["MANAGE_ROLES"],
};

exports.execute = async (client, message, args) => {
  try {
    if (!message.member.permissions.has("MANAGE_ROLES"))
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, üzgünüm ama bunu yapmak için \`Rolleri Yönet\` yetkisine sahip olmalısın~ :c`
      );

    if (!args.length)
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, silinecek rolleri girmelisin~ :c`
      );

    const deleted = [];
    const failed = [];

    for (const target of args) {
      const rol =
        message.mentions.roles.first() ||
        message.guild.roles.cache.get(target) ||
        message.guild.roles.cache.find((r) => r.name === target);

      if (!rol) {
        failed.push(target);
        continue;
      }

      try {
        await rol.delete();
        deleted.push(rol.name);
      } catch (e) {
        console.error(`rolsil hatası: ${rol.name}`, e);
        failed.push(rol.name);
      }
    }

    if (deleted.length)
      message.channel.send({
        embeds: [
          new MessageEmbed()
            .setDescription(
              `${emojis.bot.succes} | **${message.member.displayName}**, başarıyla silindi: ${deleted.join(
                ", "
              )} ✨`
            )
            .setColor("#FF5555")
            .setTimestamp(),
        ],
      });

    if (failed.length)
      message.channel.send({
        embeds: [
          new MessageEmbed()
            .setDescription(
              `${emojis.bot.error} | **${message.member.displayName}**, bazı rolleri silemedim: ${failed.join(
                ", "
              )}... belki çok hızlısın ya da yetkim yok~ :c`
            )
            .setColor("#FF0000")
            .setTimestamp(),
        ],
      });
  } catch (err) {
    console.error("rolsil genel hata:", err);
    return message.reply(
      `${emojis.bot.error} | **${message.member.displayName}**, uf! Rolleri silerken bir sorun çıktı... lütfen sonra tekrar dene~ :c`
    );
  }
};
