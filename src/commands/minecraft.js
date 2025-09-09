const Discord = require("discord.js");
const emojis = require("../emoji.json");

module.exports = {
  config: {
    name: "minecraft",
    description: "Minecraft tarzında bir başarı (achievement) resmi oluşturur.",
    aliases: ["mc"],
    usage: "minecraft <metin1> ; <metin2>",
  },

  execute: async (client, message, args) => {
    const text = args.join(" ").split(";");

    if (text.length !== 2) {
      return message.channel.send(
        `${emojis.bot.error} | **${message.member.displayName}**, metinleri ayırmayı unuttun qwq\nİki metni **;** ile ayırmalısın!`
      );
    }

    const text1 = encodeURIComponent(text[0].trim());
    const text2 = encodeURIComponent(text[1].trim());

    if (!text1 || !text2) {
      return message.channel.send(
        `${emojis.bot.error} | **${message.member.displayName}**, boş metinle achievement olmaz ki... :c`
      );
    }

    try {
      const randomNum = Math.floor(Math.random() * 21) + 10;
      const imageUrl = `https://skinmc.net/achievement/${randomNum}/${text1}/${text2}`;

      let embed = new Discord.MessageEmbed()
        .setTitle(`${emojis.bot.succes} Achievement unlocked! ✨`)
        .setImage(imageUrl)
        .setColor("RANDOM")
        .setFooter({ text: "Minecraft Achievement" });

      return message.channel.send({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      return message.channel.send(
        `${emojis.bot.error} | **${message.member.displayName}**, bir şeyler ters gitti... qwq\nSebep: \`${err.message}\``
      );
    }
  },

  help: {
    name: "minecraft",
    aliases: ["mc"],
    usage: "minecraft <metin1> ; <metin2>",
    description:
      'Minecraft başarı resmi oluşturur. Metinleri ";" ile ayırarak yazmalısınız.',
    category: "Eğlence",
    cooldown: 10,
  },
};
