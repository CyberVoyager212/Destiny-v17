const emojis = require("../emoji.json");

exports.execute = async (client, message, args) => {
  if (!client.config.admins.includes(message.author.id)) {
    return message.channel.send(
      `${emojis.bot.error} | **${message.member.displayName}**, maalesef bu komutu kullanmak için yetkin yok~ 😢`
    );
  }

  const user = message.mentions.users.first();
  if (!user) {
    return message.channel.send(
      `${emojis.bot.error} | **${message.member.displayName}**, lütfen bir kullanıcı etiketle~ ⏱`
    );
  }

  let amount = args[1];
  if (!amount || isNaN(amount)) {
    return message.channel.send(
      `${emojis.bot.error} | **${message.member.displayName}**, geçerli bir miktar girmen lazım~ 🫠`
    );
  }

  amount = parseInt(amount);
  if (amount <= 0) {
    return message.channel.send(
      `${emojis.bot.error} | **${message.member.displayName}**, miktar sıfır veya negatif olamaz~ 😵`
    );
  }

  const chooseEmoji = (amount) => {
    if (amount > 100000) return emojis.money.high;
    if (amount > 10000) return emojis.money.medium;
    return emojis.money.low;
  };

  const feeEmoji = chooseEmoji(amount);

  try {
    await client.eco.addMoney(user.id, amount);

    return message.channel.send(
      `${emojis.bot.succes} | **${user.tag}** kullanıcısına **${amount}** ${feeEmoji} başarıyla eklendi! ✨`
    );
  } catch (error) {
    console.error(error);
    return message.channel.send(
      `${emojis.bot.error} | **${message.member.displayName}**, para eklerken bir hata oluştu~ bana göre bir şeyler ters gitti 😢`
    );
  }
};

exports.help = {
  name: "addmoney",
  aliases: ["addbal"],
  usage: "addmoney @kullanıcı <miktar>",
  description: "Bir kullanıcıya belirli miktarda para ekler.",
  category: "Ekonomi",
  cooldown: 5,
  admin: true,
};
