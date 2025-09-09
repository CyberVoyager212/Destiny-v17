const { MessageEmbed } = require("discord.js");
const emojis = require("../emoji.json");

exports.help = {
  name: "roller",
  aliases: [],
  usage: "roller [@kullanıcı]",
  description:
    "Kullanıcının rollerini gösterir. Belirtilmezse kendi rollerini gösterir.",
  category: "Moderasyon",
  cooldown: 5,
};

exports.execute = async (client, message, args) => {
  try {
    const member = args[0]
      ? message.mentions.members.first() ||
        message.guild.members.cache.get(args[0])
      : message.member;

    if (!member) {
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, aradığın kullanıcı bulunamadı~ :c`
      );
    }

    const roles = member.roles.cache
      .filter((r) => r.id !== message.guild.id)
      .sort((a, b) => b.position - a.position)
      .map((r) => `<@&${r.id}>`);

    let rolList = "Rol yok";
    if (roles.length > 0) {
      if (roles.join(", ").length > 1800) {
        const shownRoles = roles.slice(0, 50);
        rolList = `${shownRoles.join(", ")} ve ${roles.length - 50} rol daha...`;
      } else {
        rolList = roles.join(", ");
      }
    }

    const embed = new MessageEmbed()
      .setTitle(`${emojis.bot.succes} | ${member.user.tag} kullanıcısının rolleri`)
      .setDescription(rolList)
      .setColor("#00FF00")
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: `ID: ${member.id}` })
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  } catch (err) {
    console.error("roller komutu hata:", err);
    return message.reply(
      `${emojis.bot.error} | **${message.member.displayName}**, uf! Bir sorun çıktı ve roller gösterilemedi~ :c`
    );
  }
};
