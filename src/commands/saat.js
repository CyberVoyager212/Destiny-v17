const emojis = require("../emoji.json");

exports.help = {
  name: "saat",
  aliases: ["time", "saatkaç"],
  usage: "saat",
  description: "Bulunduğun saat dilimine göre anlık saati gösterir.",
  category: "Eğlence",
  cooldown: 5,
};

exports.execute = async (client, message, args) => {
  try {
    const now = new Date().toLocaleString("tr-TR", {
      timeZone: "Europe/Istanbul",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    message.channel.send(
      `${emojis.bot.succes} | **${message.member.displayName}**, şu an Türkiye saati ile **${now}** ⏰`
    );
  } catch (err) {
    console.error("saat komutu hatası:", err);
    message.reply(
      `${emojis.bot.error} | **${message.member.displayName}**, uf! Saati alırken bir sorun çıktı~ lütfen biraz sonra tekrar dene :c`
    );
  }
};
