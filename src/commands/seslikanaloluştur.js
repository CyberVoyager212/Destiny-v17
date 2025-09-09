const { MessageEmbed } = require("discord.js");
const emojis = require("../emoji.json");

exports.help = {
  name: "seslikanaloluştur",
  aliases: ["skanaloluştur"],
  usage: "seslikanaloluştur <isim1> [isim2]...",
  description: "Belirtilen isimlerle 1 veya daha fazla SESLİ kanal oluşturur.",
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
        `${emojis.bot.error} | **${message.member.displayName}**, oluşturulacak sesli kanal isimlerini belirtmelisin~ :c`
      );

    const created = [];
    for (const isim of args) {
      try {
        const kanal = await message.guild.channels.create(isim, {
          type: "GUILD_VOICE",
        });
        created.push(kanal.name);
      } catch (e) {
        console.error(e);
        message.channel.send(
          `${emojis.bot.error} | **${message.member.displayName}**, "${isim}" adlı kanal oluşturulamadı~ :c`
        );
      }
    }

    if (!created.length)
      return message.channel.send(
        `${emojis.bot.error} | **${message.member.displayName}**, hiç kanal oluşturulamadı~ :c`
      );

    const embed = new MessageEmbed()
      .setDescription(`${emojis.bot.succes} | **${message.member.displayName}**, başarıyla oluşturuldu: ${created.join(", ")} ✨`)
      .setColor("#00FF00")
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  } catch (error) {
    console.error("⚠️ | seslikanaloluştur komutunda hata oluştu:", error);
    return message.reply(
      `${emojis.bot.error} | **${message.member.displayName}**, uf! Bir hata oluştu, tekrar dene~ :c`
    );
  }
};
