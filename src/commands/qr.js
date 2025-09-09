const { MessageAttachment } = require("discord.js");
const emojis = require("../emoji.json");

exports.execute = async (client, message, args) => {
  if (!args.length) {
    return message.reply(
      `${emojis.bot.error} | **${message.member.displayName}**, lütfen bir metin gir! :c`
    );
  }

  const text = encodeURIComponent(args.join(" "));
  const qrURL = `https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${text}`;

  try {
    const attachment = new MessageAttachment(qrURL, "qrcode.png");
    await message.reply({
      content: `${emojis.bot.succes} | **${message.member.displayName}**, işte QR kodun hazır! ✨`,
      files: [attachment],
    });
  } catch (error) {
    console.error("QR kod oluşturulurken hata:", error);
    return message.reply(
      `${emojis.bot.error} | **${message.member.displayName}**, uff! QR kod oluşturulurken bir hata oluştu... sonra tekrar dene~ :c`
    );
  }
};

exports.help = {
  name: "qrkodoluştur",
  aliases: ["qrkod", "qrolustur"],
  usage: "qrkodoluştur <metin>",
  description: "Girilen metinden bir QR kod oluşturur.",
  category: "Araçlar",
  cooldown: 5,
};
