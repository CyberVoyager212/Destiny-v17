const { MessageAttachment } = require("discord.js");
const fetch = require("node-fetch");
const emojis = require("../emoji.json"); // emoji verilerini içe aktar

exports.help = {
  name: "drake-meme",
  aliases: ["drake"],
  usage: "drake-meme <metin1>, <metin2>",
  description: "Drake meme oluşturur. İki metni virgülle ayırarak girin.",
  category: "Eğlence",
  cooldown: 10,
};

exports.execute = async (client, message, args) => {
  const split = args.join(" ").split(",");
  const user = split[0]?.trim();
  const user2 = split[1]?.trim();

  if (!user || !user2) {
    return message.reply(
      `${emojis.bot.error} | Hımm~ **${message.member.displayName}**, iki metin girmen gerekiyor ve bunları virgülle ayırmalısın :c`
    );
  }

  try {
    const res = await fetch(
      `https://frenchnoodles.xyz/api/endpoints/drake/?text1=${encodeURIComponent(
        user
      )}&text2=${encodeURIComponent(user2)}`
    );
    const image = await res.buffer();
    const drakememe = new MessageAttachment(image, "drake-meme.png");

    return message.channel.send({
      content: `${emojis.bot.succes} | İşte memen hazır, **${message.member.displayName}**!`,
      files: [drakememe],
    });
  } catch (error) {
    console.error(error);
    return message.reply(
      `${emojis.bot.error} | Ooops~ **${message.member.displayName}**, meme oluşturulurken bir hata oluştu :c Lütfen tekrar dene!`
    );
  }
};
