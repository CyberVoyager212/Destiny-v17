const emojis = require("../emoji.json"); // emoji.json içe aktarılır

exports.execute = async (client, message, args) => {
  const db = client.db;
  const userId = message.author.id;

  try {
    // Rastgele kazanç (1000 - 2500 arası)
    const amount = Math.floor(Math.random() * 1500) + 1000;

    // Meslek listesi
    const jobs = [
      "Yazılımcı",
      "Kasiyer",
      "Kurye",
      "Grafiker",
      "Video Editörü",
      "Çaycı",
      "Web Tasarımcısı",
      "Animatör",
      "Stajyer",
      "Anketör",
      "Çevirmen",
    ];
    const job = jobs[Math.floor(Math.random() * jobs.length)];

    // Para ekleme
    const balanceKey = `money_${userId}`;
    await db.add(balanceKey, amount);
    const balance = await db.get(balanceKey);

    // Kazanca göre emoji seçici
    function chooseEmoji(amount) {
      if (amount > 100000) return emojis.money.high;
      if (amount > 10000) return emojis.money.medium;
      return emojis.money.low;
    }

    const amountEmoji = chooseEmoji(amount);
    const balanceEmoji = chooseEmoji(balance);

    // Başarılı işlem mesajı (anime-style)
    return message.reply(
      `${emojis.bot.succes} | **${message.member.displayName}**, ${job} olarak çalıştın ve kazancın verildi~ ✨\n> Aldığın miktar: **${amount} ${amountEmoji}**\n> Şu an toplam paran: **${balance} ${balanceEmoji}**`
    );
  } catch (err) {
    console.error("work hata:", err);
    return message.reply(
      `${emojis.bot.error} | **${message.member.displayName}**, çalışırken bir şeyler ters gitti qwq~ \n> Hata: \`${err?.message || "Bilinmeyen hata"}\``
    );
  }
};

exports.help = {
  name: "work",
  aliases: [],
  usage: "work",
  description: "Çalışarak para kazanırsınız.",
  category: "Ekonomi",
  cooldown: 60, 
};
