const { MessageEmbed } = require("discord.js");
const emojis = require("../emoji.json");

exports.help = {
  name: "afklist",
  aliases: ["afkliste", "afk-liste"],
  usage: "afklist",
  description: "Şu anda AFK olan kullanıcıları gösterir.",
  category: "Araçlar",
  cooldown: 10,
};

exports.execute = async (client, message, args) => {
  try {
    const db = client.db;

    const allEntries = await db.all();
    const afkUsers = allEntries.filter((e) => e.id.startsWith("afk_"));

    if (!afkUsers.length) {
      return message.channel.send(
        `${emojis.bot.error} | **${message.member.displayName}**, şu anda hiç AFK kullanıcı yok~ 😢`
      );
    }

    const embed = new MessageEmbed()
      .setTitle(`${emojis.bot.succes} | AFK Kullanıcılar`)
      .setColor("YELLOW")
      .setDescription(
        afkUsers
          .map(({ id, value }, index) => {
            const userId = id.split("_")[1];
            const sebep = value.reason || "Belirtilmemiş";
            return `**${index + 1}.** <@${userId}> — Sebep: ${sebep}`;
          })
          .join("\n")
      )
      .setFooter({ text: `Toplam AFK: ${afkUsers.length}` });

    return message.channel.send({ embeds: [embed] });
  } catch (err) {
    console.error("afklist komutu hata:", err);
    return message.channel.send(
      `${emojis.bot.error} | **${message.member.displayName}**, AFK listesini alırken bir hata oluştu~ 😢 Lütfen tekrar dene!`
    );
  }
};
