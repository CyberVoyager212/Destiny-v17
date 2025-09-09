const emojis = require("../emoji.json");

function chooseEmoji(amount) {
  if (amount > 100000) return emojis.money.high;
  if (amount > 10000) return emojis.money.medium;
  return emojis.money.low;
}

exports.execute = async (client, message, args) => {
  try {
    const userId = message.author.id;

    const amount = Math.floor(Math.random() * 41) + 10;
    let money = (await client.db.get(`money_${userId}`)) || 0;
    money += amount;
    await client.db.set(`money_${userId}`, money);

    const users = [
      "PewDiePie",
      "T-Series",
      "Sans",
      "Zero",
      "Ninja",
      "Jacksepticeye",
      "Markiplier",
      "Dream",
      "Pokimane",
      "Ariana Grande",
    ];
    const randomUser = users[Math.floor(Math.random() * users.length)];
    const emoji = chooseEmoji(money);

    return message.reply(
      `${emojis.bot.succes} | **${randomUser}** size **${amount}** bağışladı!\n💰 Şu anda toplamda **${money}** ${emoji} paranız var~`
    );
  } catch (error) {
    console.error("beg komutu hata:", error);
    return message.reply(
      `${emojis.bot.error} | **${message.member.displayName}**, beg işlemi sırasında bir sorun çıktı~ Lütfen tekrar dene :c`
    );
  }
};

exports.help = {
  name: "beg",
  aliases: [],
  usage: "beg",
  description: "Yardım dilenmek için kullanılır, anime-style arayüz ile gösterir.",
  category: "Ekonomi",
  cooldown: 300,
};
