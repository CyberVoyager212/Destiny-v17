const { MessageAttachment } = require("discord.js");
const Canvas = require("canvas");
const emojis = require("../emoji.json");

module.exports.help = {
  name: "avatarfusion",
  aliases: ["afusion", "fusion"],
  description: "İki kullanıcının avatarlarını anime-style olarak birleştirir.",
  usage: "avatarfusion [@kullanıcı1] [@kullanıcı2]",
  category: "Eğlence",
  cooldown: 5,
};

module.exports.execute = async (client, message, args) => {
  if (!message.guild.me.permissions.has("ATTACH_FILES")) {
    return message.reply(
      `${emojis.bot.error} | **${message.member.displayName}**, maalesef **ATTACH_FILES** yetkim yok~ Avatarları birleştiremiyorum :c`
    );
  }

  if (!args[0] || !args[1]) {
    return message.reply(
      `${emojis.bot.error} | **${message.member.displayName}**, lütfen iki farklı kullanıcı etiketle veya ID gir~`
    );
  }

  const member1 =
    message.mentions.members.first() || message.guild.members.cache.get(args[0]);
  const member2 =
    message.mentions.members.size > 1
      ? message.mentions.members.map((m) => m)[1]
      : message.guild.members.cache.get(args[1]);

  if (!member1 || !member2) {
    return message.reply(
      `${emojis.bot.error} | **${message.member.displayName}**, geçerli iki kullanıcı bulunamadı~`
    );
  }

  try {
    const width = 512;
    const height = 512;
    const canvas = Canvas.createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    const avatar1 = await Canvas.loadImage(
      member1.user.displayAvatarURL({ format: "png", size: 512 })
    );
    const avatar2 = await Canvas.loadImage(
      member2.user.displayAvatarURL({ format: "png", size: 512 })
    );

    ctx.drawImage(avatar1, 0, 0, width, height);
    ctx.globalAlpha = 0.5;
    ctx.drawImage(avatar2, 0, 0, width, height);
    ctx.globalAlpha = 1;

    const attachment = new MessageAttachment(canvas.toBuffer(), "avatarfusion.png");

    return message.channel.send({
      content: `${emojis.bot.succes} | **${member1.user.username} + ${member2.user.username} Avatar Füzyonu Hazır!**`,
      files: [attachment],
    });
  } catch (error) {
    console.error("Avatar Fusion Hatası:", error);
    return message.reply(
      `${emojis.bot.error} | **${message.member.displayName}**, avatarları birleştirirken beklenmedik bir hata oluştu~ Lütfen tekrar dene!`
    );
  }
};
