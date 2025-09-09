const { MessageEmbed } = require("discord.js");
const superagent = require("superagent");
const emojis = require("../emoji.json"); // emoji.json yolunu kendi yapına göre ayarla

module.exports = {
  config: {
    name: "pat",
    description: "Birine pat yapar",
    aliases: ["pat"],
    usage: "<kullanıcı>",
    category: "Eğlence",
    cooldown: 5,
  },

  execute: async (client, message, args) => {
    let victim =
      message.mentions.users.first() ||
      (args.length > 0
        ? message.guild.members.cache
            .filter((e) =>
              e.user.username
                .toLowerCase()
                .includes(args.join(" ").toLowerCase())
            )
            .first()?.user
        : message.author) ||
      message.author;

    try {
      const { body } = await superagent.get(
        "https://nekos.life/api/v2/img/pat"
      );

      const embed = new MessageEmbed()
        .setColor("YELLOW")
        .setTitle(`${emojis.bot.succes} | Pat zamanı~!`)
        .setDescription(`**${message.member.displayName}**, ${victim} kullanıcısına sevimli bir pat yaptı! 💖`)
        .setImage(body.url)
        .setTimestamp();

      return message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      return message.channel.send(
        `${emojis.bot.error} | **${message.member.displayName}**, pat resmi alınırken bir hata oluştu~ 😢 Lütfen tekrar dene!`
      );
    }
  },

  help: {
    name: "pat",
    description:
      "Birine pat yapar. Birini etiketleyerek ya da isimle bir kullanıcıyı belirterek onlara pat yapabilirsiniz.",
    usage: "pat <kullanıcı>",
    category: "Eğlence",
    cooldown: 5,
    examples: ["pat @kullanıcı", "pat"],
  },
};
