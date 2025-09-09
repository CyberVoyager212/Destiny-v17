const { MessageEmbed } = require("discord.js");
const { QuickDB } = require("quick.db");
const db = new QuickDB();
const emojis = require("../emoji.json");

exports.help = {
  name: "nekadarnesin",
  aliases: [
    "nkn", "nkadarn", "nknesin", "nekdarn", "nksn", "nk", "nesin",
    "nkdn", "yuzdebak", "ydbk", "ydnsl", "yznsl", "performans",
    "puan", "puanbak", "nehaldesin", "nasilim"
  ],
  usage: "nekadarnesin",
  description:
    "Farklı alanlarda ne kadar iyi olduğunu rastgele ama sabit yüzdelerle gösterir.",
  category: "Eğlence",
  cooldown: 5,
};

const areas = [
  "Kodcu", "Hacker", "Kaslı", "Zeki", "Komik",
  "Güzel", "Yetenekli", "Hızlı", "Sabırlı", "Cesur"
];

exports.execute = async (client, message, args) => {
  try {
    const userId = message.author.id;
    let data = await db.get(`nekadarnesin_${userId}`);

    if (!data) {
      data = {};
      for (const area of areas) {
        data[area] = Math.floor(Math.random() * 101);
      }
      await db.set(`nekadarnesin_${userId}`, data);
    }

    const embed = new MessageEmbed()
      .setTitle(`${emojis.bot.succes} | ${message.author.username}, İşte senin yüzdelerin!`)
      .setColor("#5865F2")
      .setFooter({ text: "✨ Aynı yüzdeler bu kullanıcı için sabittir, hile yapmaya gerek yok :3" })
      .setTimestamp();

    for (const area of areas) {
      embed.addField(area, `%${data[area]}`, true);
    }

    await message.channel.send({ embeds: [embed] });
  } catch (err) {
    console.error("🛑 nekadarnesin komutu hata:", err);
    return message.channel.send(
      `${emojis.bot.error} | **${message.member.displayName}**, uf! Bir şeyler ters gitti... Lütfen biraz sakin ol ve tekrar dene~ :c`
    );
  }
};
