const emojis = require("../emoji.json"); // emoji.json'u içe aktar

function chooseEmoji(amount) {
  if (amount > 100000) return emojis.money.high;
  if (amount > 10000) return emojis.money.medium;
  return emojis.money.low;
}

module.exports.execute = async (client, message, args) => {
  try {
    const userId = message.author.id;
    const moneyKey = `money_${userId}`;

    const amount = Math.floor(Math.random() * 500) + 100; // 100 - 599
    const currentMoney = (await client.db.get(moneyKey)) || 0;
    const newBalance = currentMoney + amount;

    await client.db.set(moneyKey, newBalance);

    const emoji = chooseEmoji(newBalance);

    return message.reply(
      `${emojis.bot.succes} | Tebrikler **${message.member.displayName}**! Günlük ödülün hazır~ 💖\n${emoji} **Kazandığın miktar:** \`${amount}\`\n💼 **Toplam paran:** \`${newBalance}\``
    );
  } catch (error) {
    console.error("⚠️ daily komutu hata:", error);
    return message.reply(
      `${emojis.bot.error} | Aaa~ bir hata oluştu! Sunucudaki para ruhları karıştı galiba 😵 Lütfen tekrar dene~`
    );
  }
};

module.exports.help = {
  name: "daily",
  aliases: ["günlük"],
  usage: "daily",
  description: "Günlük para ödülü alırsınız.",
  category: "Ekonomi",
  cooldown: 86400,
};
