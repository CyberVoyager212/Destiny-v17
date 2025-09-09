const { MessageAttachment } = require("discord.js");
const DIG = require("discord-image-generation");
const emojis = require("../emoji.json");

exports.execute = async (client, message, args) => {
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

  let loadingMsg;
  try {
    loadingMsg = await message.channel.send(
      `${emojis.bot.succes} | **${message.member.displayName}**, biraz bekle~ avatar işleniyor qwq`
    );

    let avatar = user.user.displayAvatarURL({
      dynamic: false,
      format: "png",
    });

    let img = await new DIG.Rip().getImage(avatar);
    let attachment = new MessageAttachment(img, "rip.png");

    setTimeout(() => loadingMsg.delete().catch(() => {}), 5000);

    return message.channel.send({
      content: `${emojis.bot.succes} | **${message.member.displayName}**, RIP hazır!`,
      files: [attachment],
    });
  } catch (err) {
    console.error("RIP komutu hata:", err);
    if (loadingMsg) loadingMsg.delete().catch(() => {});
    return message.channel.send(
      `${emojis.bot.error} | **${message.member.displayName}**, uff! RIP resmi oluşturulamadı qwq`
    );
  }
};

exports.help = {
  name: "rip",
  aliases: ["rip"],
  description: "Bir kullanıcının avatarından RIP resmi oluşturur.",
  usage: "[mention | kullanıcı adı]",
  category: "Eğlence",
  cooldown: 5,
};
