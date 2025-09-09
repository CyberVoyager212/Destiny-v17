const DIG = require("discord-image-generation");
const { MessageAttachment } = require("discord.js");
const emojis = require("../emoji.json");

exports.help = {
  name: "blur",
  aliases: [],
  usage: "blur [@kullanıcı]",
  description: "Kullanıcının avatarını anime tarzında bulanıklaştırır.",
  category: "Eğlence",
  cooldown: 5,
};

exports.execute = async (client, message, args) => {
  try {
    const member = message.mentions.members.first() || message.member;
    const avatarURL = member.user.displayAvatarURL({ format: "png", size: 512 });

    const img = await new DIG.Blur().getImage(avatarURL);
    const attachment = new MessageAttachment(img, "blur.png");

    await message.channel.send({
      content: `${emojis.bot.succes} | **${message.member.displayName}**, avatar başarıyla bulanıklaştırıldı! Anime modunda gözlerin kamaşsın~`,
      files: [attachment],
    });
  } catch (error) {
    console.error(error);
    await message.channel.send(
      `${emojis.bot.error} | Haaay, **${message.member.displayName}**, avatar bulanıklaştırılamadı~ Biraz bekle sonra tekrar dene!`
    );
  }
};
