const { MessageAttachment } = require("discord.js");
const DIG = require("discord-image-generation");
const emojis = require("../emoji.json");

module.exports.help = {
  name: "delete",
  aliases: [],
  description:
    "Belirtilen kullanıcının avatarını silinmiş gibi gösteren bir resim oluşturur.",
  usage: "delete [@kullanıcı]",
  category: "Eğlence",
  cooldown: 3,
};

module.exports.execute = async (client, message, args) => {
  let user =
    message.mentions.members.first() ||
    message.guild.members.cache.get(args[0]) ||
    message.guild.members.cache.find(
      (m) => m.user.username.toLowerCase() === args.join(" ").toLowerCase()
    ) ||
    message.guild.members.cache.find(
      (m) => m.displayName.toLowerCase() === args.join(" ").toLowerCase()
    ) ||
    message.member;

  if (!user)
    return message.reply(
      `${emojis.bot.error} | Haa~ kim olduğunu bulamadım, **${message.member.displayName}**! Lütfen geçerli bir kullanıcı etiketle~`
    );

  const loadingMsg = await message.channel.send(
    `🔄 | **${message.member.displayName}**, resim hazırlanıyor... Sabırlı ol~`
  );

  const avatar = user.user.displayAvatarURL({ format: "png", size: 512 });

  try {
    const img = await new DIG.Delete().getImage(avatar);
    const attachment = new MessageAttachment(img, "delete.png");

    await loadingMsg.delete();
    return message.channel.send({
      content: `${emojis.bot.succes} | İşte silinmiş avatar hazır, **${message.member.displayName}**!`,
      files: [attachment],
    });
  } catch (err) {
    console.error("Delete komutu hatası:", err);
    return message.reply(
      `${emojis.bot.error} | Uuups! Resim oluşturulurken bir hata oluştu 😵 Lütfen tekrar dene~`
    );
  }
};
