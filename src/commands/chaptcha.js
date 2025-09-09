const { MessageAttachment } = require("discord.js");
const fetch = require("node-fetch");
const emojis = require("../emoji.json");

module.exports.help = {
  name: "chaptcha",
  aliases: ["captcha"],
  description:
    "Belirtilen kullanıcının profil fotoğrafı ile sahte bir captcha oluşturur.",
  usage: "chaptcha [kullanıcı]",
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

  const waitMsg = await message.channel.send(
    `✨ | ${message.member.displayName}, captcha hazırlanıyor, biraz sabret~`
  );

  try {
    const apiUrl = `https://nekobot.xyz/api/imagegen?type=captcha&username=${encodeURIComponent(
      user.user.username
    )}&url=${user.user.displayAvatarURL({ format: "png", size: 512 })}`;

    const response = await fetch(apiUrl);
    const data = await response.json();

    if (!data.message) {
      return waitMsg.edit(
        `${emojis.bot.error} | Hımm… bir sorun çıktı, captcha resmi gelmedi 😢 Tekrar deneyebilirsin!`
      );
    }

    const attachment = new MessageAttachment(data.message, "captcha.png");
    await message.channel.send({
      content: `${emojis.bot.succes} | İşte captcha’n hazır! Çok şirin oldu bence 💖`,
      files: [attachment],
    });

    waitMsg.delete();
  } catch (err) {
    console.error("Captcha API hatası:", err);
    waitMsg.edit(
      `${emojis.bot.error} | Aaa~ bir hata oldu! Sunucudaki tanrılar mı karıştı ne? 😵 Tekrar deneyelim…`
    );
  }
};
