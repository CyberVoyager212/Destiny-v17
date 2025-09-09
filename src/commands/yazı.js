const emojis = require("../emoji.json");

module.exports.help = {
  name: "yazı",
  aliases: [],
  usage: "yazı <bahismiktarı>",
  description: "Yazı bahsi atar, yazı gelirse kazanırsın.",
  category: "Ekonomi",
  cooldown: 5,
};

module.exports.execute = async (client, message, args) => {
  const db = client.db;
  const userId = message.author.id;

  try {
    const betAmount = parseInt(args[0]);
    if (!betAmount || betAmount <= 0)
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, lütfen bahis miktarını doğru gir~ qwq`
      );

    // Kullanıcının mevcut parası
    const balanceKey = `money_${userId}`;
    let balance = (await db.get(balanceKey)) || 0;

    if (balance < betAmount)
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, yeterli paran yok~ 😢\n> Şu an toplam paran: ${balance}`
      );

    // Başlangıç spinner mesajı
    const spinner = emojis.coinflip.spinner;
    const msg = await message.channel.send(
      `${spinner} | **${message.member.displayName}**, para fırlatılıyor~ 🥺💫`
    );

    // Sonuç: yazı gelirse kazanır, aksi durumda kaybeder
    const isYazi = Math.random() < 0.5; // %50 şans

    setTimeout(async () => {
      if (isYazi) {
        const winnings = betAmount * 2;
        balance += winnings;
        await db.set(balanceKey, balance);

        msg.edit(
          `${emojis.bot.succes} | **${message.member.displayName}**, yazı geldi! ✨\n` +
            `${emojis.coinflip.heads} Sonuç: **Yazı**\n> Bahsin: ${betAmount} → Kazancın: ${winnings}\n> Toplam paran: ${balance}`
        );
      } else {
        balance -= betAmount;
        await db.set(balanceKey, balance);

        msg.edit(
          `${emojis.bot.error} | **${message.member.displayName}**, yazı gelmedi... 😢\n` +
            `${emojis.coinflip.tails} Sonuç: **Tura**\n> Kaybettiğin bahis: ${betAmount}\n> Kalan paran: ${balance}`
        );
      }
    }, 4000);
  } catch (err) {
    console.error("yazı hatası:", err);
    return message.reply(
      `${emojis.bot.error} | **${message.member.displayName}**, bir şeyler ters gitti qwq~\n> Hata: \`${err?.message || "Bilinmeyen hata"}\``
    );
  }
};
