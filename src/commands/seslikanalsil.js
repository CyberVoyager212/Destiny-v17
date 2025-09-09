const { MessageEmbed } = require("discord.js");
const emojis = require("../emoji.json");

exports.help = {
  name: "seslikanalsil",
  aliases: ["skanalsil"],
  usage: "seslikanalsil <#kanal|id|isim> [başka...]",
  description: "Belirtilen SESLİ kanalları siler.",
  category: "Moderasyon",
  cooldown: 5,
  permissions: ["MANAGE_CHANNELS"],
};

exports.execute = async (client, message, args) => {
  try {
    if (!message.member.permissions.has("MANAGE_CHANNELS"))
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, üzgünüm ama bunu yapmak için Kanalları Yönet yetkin yok~ :c`
      );

    if (!args.length)
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, silinecek sesli kanalları belirtmelisin~ :c`
      );

    const deleted = [];
    for (const target of args) {
      const kanal =
        message.mentions.channels.first() ||
        message.guild.channels.cache.get(target) ||
        message.guild.channels.cache.find((c) => c.name === target);

      if (!kanal || kanal.type !== "GUILD_VOICE") {
        message.channel.send(
          `${emojis.bot.error} | **${message.member.displayName}**, "${target}" bulunamadı veya SESLİ kanal değil~ :c`
        );
        continue;
      }

      try {
        await kanal.delete();
        deleted.push(kanal.name);
      } catch (e) {
        console.error(e);
        message.channel.send(
          `${emojis.bot.error} | **${message.member.displayName}**, "${kanal.name}" silinemedi~ :c`
        );
      }
    }

    if (!deleted.length)
      return message.channel.send(
        `${emojis.bot.error} | **${message.member.displayName}**, hiç kanal silinemedi~ :c`
      );

    const embed = new MessageEmbed()
      .setDescription(
        `${emojis.bot.succes} | **${message.member.displayName}**, başarıyla silindi: ${deleted.join(", ")} ✨`
      )
      .setColor("#FF0000")
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  } catch (error) {
    console.error("⚠️ | seslikanalsil komutunda hata oluştu:", error);
    return message.reply(
      `${emojis.bot.error} | **${message.member.displayName}**, uf! Bir hata oluştu, tekrar dene~ :c`
    );
  }
};
