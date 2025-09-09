const { MessageEmbed } = require("discord.js");
const emojis = require("../emoji.json");

module.exports.help = {
  name: "changemymind",
  aliases: ["cmm"],
  description: "Belirtilen metni Change My Mind meme formatında oluşturur.",
  usage: "changemymind <yazı>",
  category: "Eğlence",
  cooldown: 3,
};

module.exports.execute = async (client, message, args) => {
  if (!args.length) {
    return message.reply(
      `${emojis.bot.error} | Ooops~ **${message.member.displayName}**, bana bir metin verir misin? 🥺`
    );
  }

  const text = encodeURIComponent(args.join(" "));
  const imageUrl = `https://vacefron.nl/api/changemymind?text=${text}`;

  const embed = new MessageEmbed()
    .setTitle("🪧 Change My Mind!")
    .setImage(imageUrl)
    .setColor("RANDOM")
    .setFooter({
      text: `Hazırlayan: ${message.member.displayName} ❤️`,
      iconURL: message.author.displayAvatarURL({ dynamic: true }),
    });

  return message.channel.send({
    content: `${emojis.bot.succes} | İşte hazır! Düşüncelerini değiştir 😎`,
    embeds: [embed],
  });
};
