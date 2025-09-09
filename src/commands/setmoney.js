const emojis = require("../emoji.json"); // emoji.json içe aktarılır

// Kazanca göre emoji seçici
function chooseEmoji(amount) {
  if (amount > 100000) return emojis.money.high;
  if (amount > 10000) return emojis.money.medium;
  return emojis.money.low;
}

exports.execute = async (client, message, args) => {
  try {
    if (!client.config.admins.includes(message.author.id)) {
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, uf! Bu komutu kullanma yetkin yok~ :c`
      );
    }

    const user = message.mentions.users.first();
    if (!user) {
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, lütfen bir kullanıcı etiketle~ Örnek: \`setmoney @kullanıcı 1000\` :c`
      );
    }

    const amount = args[1];
    if (!amount || isNaN(amount) || parseInt(amount) < 0) {
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, geçerli bir miktar gir lütfen~ Örnek: \`setmoney @kullanıcı 1000\` :c`
      );
    }

    const moneyKey = `money_${user.id}`;
    await client.db.set(moneyKey, parseInt(amount));
    const newBalance = await client.db.get(moneyKey);

    return message.channel.send(
      `${emojis.bot.succes} | **${message.member.displayName}**, ${user.tag} kullanıcısının bakiyesi başarıyla \`${newBalance}\` ${chooseEmoji(
        newBalance
      )} olarak güncellendi! ✨`
    );
  } catch (error) {
    console.error(error);
    return message.reply(
      `${emojis.bot.error} | **${message.member.displayName}**, uf! Bir hata oluştu, tekrar dene~ :c`
    );
  }
};

exports.help = {
  name: "setmoney",
  aliases: ["setbal"],
  usage: "setmoney @kullanıcı <miktar>",
  description:
    "Belirtilen kullanıcının parasını belirttiğiniz miktara ayarlarsınız.",
  category: "Ekonomi",
  cooldown: 5,
  admin: true,
};
