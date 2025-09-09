const emojis = require("../emoji.json"); // emoji verilerini içe aktar

function chooseEmoji(amount) {
  if (amount > 100000) return emojis.money.high;
  if (amount > 10000) return emojis.money.medium;
  return emojis.money.low;
}

exports.help = {
  name: "delmoney",
  aliases: ["delbal", "silpara"],
  usage: "delmoney @kullanıcı <miktar>",
  description: "Bir kullanıcının bakiyesinden belirli miktarda para siler.",
  category: "Ekonomi",
  cooldown: 5,
  admin: true,
};

exports.execute = async (client, message, args) => {
  if (!client.config.admins.includes(message.author.id)) {
    return message.reply(
      `${emojis.bot.error} | Ooops~ **${message.member.displayName}**, bu komutu kullanma yetkin yok 😵`
    );
  }

  const user = message.mentions.users.first();
  if (!user)
    return message.reply(
      `${emojis.bot.error} | Hımm~ bir kullanıcı etiketlemen gerek, **${message.member.displayName}** :c`
    );

  let amount = args[1];
  if (!amount || isNaN(amount)) {
    return message.reply(
      `${emojis.bot.error} | Lütfen geçerli bir miktar yaz, **${message.member.displayName}**~`
    );
  }

  amount = parseInt(amount);
  if (amount <= 0) {
    return message.reply(
      `${emojis.bot.error} | Miktar sıfır veya negatif olamaz~ **${message.member.displayName}**`
    );
  }

  const feeEmoji = chooseEmoji(amount);

  try {
    await client.eco.removeMoney(user.id, amount);

    return message.channel.send(
      `${emojis.bot.succes} | Hoooray! **${user.tag}** kullanıcısından **${amount}** ${feeEmoji} başarıyla silindi! 🎉`
    );
  } catch (error) {
    console.error("delmoney komutu hata:", error);
    return message.reply(
      `${emojis.bot.error} | Ooops~ Para silinirken bir hata oluştu, **${message.member.displayName}** 😵 Lütfen tekrar dene!`
    );
  }
};
