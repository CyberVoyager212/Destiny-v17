const { MessageAttachment } = require("discord.js");
const Canvas = require("canvas");
const emojis = require("../emoji.json");

module.exports.help = {
  name: "facepalm",
  aliases: [],
  description: "Belirtilen kullanıcının avatarına facepalm efekti uygular.",
  usage: "facepalm [@kullanıcı]",
  category: "Eğlence",
  cooldown: 3,
};

module.exports.execute = async (bot, message, args) => {
  try {
    let user =
      message.mentions.members.first() ||
      message.guild.members.cache.get(args[0]) ||
      message.guild.members.cache.find(
        (r) => r.user.username.toLowerCase() === args.join(" ").toLowerCase()
      ) ||
      message.guild.members.cache.find(
        (r) => r.displayName.toLowerCase() === args.join(" ").toLowerCase()
      ) ||
      message.member;

    if (!user) {
      return message.channel.send(
        `${emojis.bot.error} | **${message.member.displayName}**, hm... kimi seçtiğini anlayamadım~ Lütfen geçerli bir kullanıcı belirt :3`
      );
    }

    let m = await message.channel.send(`⏳ | **${message.member.displayName}**, bekle biraz~ sihir hazırlanıyor...`);

    const canvas = Canvas.createCanvas(632, 357);
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, 632, 357);

    let avatar = await Canvas.loadImage(
      user.user.displayAvatarURL({ format: "png", size: 512 })
    );
    ctx.drawImage(avatar, 199, 112, 235, 235);

    let layer = await Canvas.loadImage(
      "https://raw.githubusercontent.com/Androz2091/AtlantaBot/master/assets/img/facepalm.png"
    );
    ctx.drawImage(layer, 0, 0, 632, 357);

    let attachment = new MessageAttachment(canvas.toBuffer(), "facepalm.png");

    await m.delete();
    return message.channel.send({
      content: `${emojis.bot.succes} | İşte oldu~ facepalm hazır ^^`,
      files: [attachment],
    });
  } catch (err) {
    return message.channel.send(
      `${emojis.bot.error} | **${message.member.displayName}**, işler biraz karıştı~ qwq\n\`\`\`js\n${String(err).slice(0, 1500)}\n\`\`\``
    );
  }
};
