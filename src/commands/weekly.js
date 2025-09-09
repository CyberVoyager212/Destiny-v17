const emojis = require("../emoji.json"); // emoji.json içe aktarılır

// Alınan miktara göre emoji seçici
function chooseAmountEmoji(amount) {
  if (amount > 100000) return emojis.money.high;
  if (amount > 10000) return emojis.money.medium;
  return emojis.money.low;
}

// Toplam paraya göre emoji seçici
function chooseTotalEmoji(total) {
  if (total > 500000) return emojis.money.high;
  if (total > 50000) return emojis.money.medium;
  return emojis.money.low;
}

exports.execute = async (client, message, args) => {
  const db = client.db; // quick.db instance
  const userId = message.author.id;
  const moneyKey = `money_${userId}`;

  try {
    // Random miktar belirle (500 ile 1500 arası)
    const amount = Math.floor(Math.random() * 1000) + 500;

    // Kullanıcının parasını al (yoksa 0)
    const currentMoney = (await db.get(moneyKey)) || 0;
    const newMoney = currentMoney + amount;

    // Parayı ekle
    await db.set(moneyKey, newMoney);

    // Emoji seç
    const amountEmoji = chooseAmountEmoji(amount);
    const totalEmoji = chooseTotalEmoji(newMoney);

    // Başarılı işlem mesajı (anime-style)
    return message.channel.send(
      `${emojis.bot.succes} | **${message.member.displayName}**, haftalık kredin başarıyla verildi~ ✨\n` +
      `> Aldığın miktar: **${amount}** ${amountEmoji}\n` +
      `> Şu an toplam paran: **${newMoney}** ${totalEmoji}`
    );
  } catch (err) {
    console.error("weekly hata:", err);
    return message.reply(
      `${emojis.bot.error} | **${message.member.displayName}**, ödül verilirken bir şeyler ters gitti qwq~ \n> Hata: \`${err?.message || "Bilinmeyen hata"}\``
    );
  }
};

exports.help = {
  name: "weekly",
  aliases: [],
  usage: "weekly",
  description: "Haftalık ödülünüzü almanızı sağlar.",
  category: "Ekonomi",
  cooldown: 5
};
