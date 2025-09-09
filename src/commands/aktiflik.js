const { MessageEmbed } = require("discord.js");
const emojis = require("../emoji.json");

exports.help = {
  name: "bot-aktiflik",
  aliases: ["ba", "aktiflik"],
  usage: "bot-aktiflik",
  description: "Botun aktiflik durumunu gösterir.",
  category: "Bot",
  cooldown: 5,
};

exports.execute = async (client, message, args) => {
  try {
    const uptime = client.uptime;

    const days = Math.floor(uptime / 86400000);
    const hours = Math.floor((uptime % 86400000) / 3600000);
    const minutes = Math.floor((uptime % 3600000) / 60000);
    const seconds = Math.floor((uptime % 60000) / 1000);

    const embed = new MessageEmbed()
      .setTitle(`${emojis.bot.succes} | ${client.user.username} Aktiflik Bilgisi`)
      .setColor("#5865F2")
      .setDescription(
        `Bot **${days}** gün, **${hours}** saat, **${minutes}** dakika, **${seconds}** saniyedir aktif~ ⏱`
      )
      .setFooter({
        text: `İsteyen: ${
          message.member ? message.member.displayName : message.author.username
        }`,
        iconURL: message.author.displayAvatarURL({ dynamic: true }),
      })
      .setTimestamp();

    return message.channel.send({ embeds: [embed] });
  } catch (err) {
    console.error("bot-aktiflik komutu hata:", err);
    return message.channel.send(
      `${emojis.bot.error} | **${message.member.displayName}**, botun aktiflik bilgisini alırken bir hata oluştu~ 😢 Lütfen tekrar dene!`
    );
  }
};
