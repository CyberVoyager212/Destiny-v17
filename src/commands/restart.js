const fs = require("fs");
const emojis = require("../emoji.json");

exports.help = {
  name: "restart",
  aliases: ["r"],
  usage: "restart",
  description: "Botu yeniden başlatır (geliştirici komutu).",
  category: "Bot",
  cooldown: 5,
  admin: true,
};

exports.execute = async (client, message, args) => {
  if (!client.config.admins.includes(message.author.id)) {
    return message.reply(
      `${emojis.bot.error} | **${message.member.displayName}**, üzgünüm ama bunu yapmak için yetkin yok~ :c`
    );
  }

  try {
    fs.writeFileSync("restart.txt", "Bot yeniden başlatılıyor...");
    const now = Math.floor(Date.now() / 1000);
    const restartTime = now + 5;

    await message.reply(
      `${emojis.bot.succes} | **${message.member.displayName}**, restart işlemi başlatıldı! Bot kendini yeniden başlatıyor~ ⏱\nKomutları tekrar kullanabilirsin: <t:${restartTime}:R>`
    );
  } catch (err) {
    console.error("Restart dosyası oluşturulurken hata:", err);
    return message.reply(
      `${emojis.bot.error} | **${message.member.displayName}**, uf! Restart dosyası oluşturulamadı... lütfen biraz sonra tekrar dene~ :c`
    );
  }
};
