const { MessageEmbed } = require("discord.js");
const emojis = require("../emoji.json");

exports.help = {
  name: "zombi",
  description: "Zombi kıyametinde hayatta kalma şansını hesaplar.",
  usage: "zombi",
  example: "zombi",
  category: "Eğlence",
  cooldown: 5,
};

exports.execute = async (client, message, args) => {
  try {
    const şans = Math.floor(Math.random() * 101); // %0 - %100 arası
    const yorumlar = [
      "Üzgünüm ama ilk 5 dakikada ısırıldın... 🧟‍♂️",
      "Şansın pek yok, saklanacak yer bulmalısın! 😨",
      "Ortalama bir şansın var, dikkatli ol! ⚠️",
      "Güçlü ve zekisin, bayağı dayanırsın! 🔥",
      "Sen tam bir hayatta kalma ustasısın! 💪",
    ];

    let yorum = "";
    if (şans < 20) yorum = yorumlar[0];
    else if (şans < 40) yorum = yorumlar[1];
    else if (şans < 60) yorum = yorumlar[2];
    else if (şans < 80) yorum = yorumlar[3];
    else yorum = yorumlar[4];

    const embed = new MessageEmbed()
      .setTitle(`${emojis.bot.succes} | 🧟‍♂️ Zombi Kıyameti Testi 🧟‍♀️`)
      .setDescription(
        `**${message.member.displayName}**, hayatta kalma şansın: **%${şans}**\n${yorum}`
      )
      .setColor("#ff4444");

    return message.channel.send({ embeds: [embed] });
  } catch (err) {
    console.error("zombi hatası:", err);
    return message.reply(
      `${emojis.bot.error} | **${message.member.displayName}**, test sırasında bir şeyler ters gitti qwq~\n> Hata: \`${err?.message || "Bilinmeyen hata"}\``
    );
  }
};
