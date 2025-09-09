const { MessageEmbed } = require("discord.js");
const emojis = require("../emoji.json");

exports.execute = async (bot, message, args) => {
  const roasts = [
    "Senin IQ seviyen, oda sıcaklığından düşük olabilir mi?",
    "Bir duvara çarpsan, duvar bile daha zeki görünürdü.",
    "Eğer bir zeka yarışması olsaydı, sen izleyici olurdun.",
    "Meyve suyu kutusundaki pipetten daha faydasızsın.",
    "Senin esprilerin, uykusuz geceler kadar sıkıcı.",
    "Senin hakkında konuşmak yerine duvar izlemeyi tercih ederim.",
  ];

  let member =
    message.mentions.members.first() ||
    message.guild.members.cache.get(args[0]) ||
    message.guild.members.cache.find(
      (r) => r.user.username.toLowerCase() === args.join(" ").toLowerCase()
    ) ||
    message.guild.members.cache.find(
      (r) => r.displayName.toLowerCase() === args.join(" ").toLowerCase()
    );

  let roast = roasts[Math.floor(Math.random() * roasts.length)];

  if (!member) {
    const sembed = new MessageEmbed()
      .setColor("RED")
      .setDescription(
        `${emojis.bot.error} | **${message.member.displayName}**, kendine mi sataşmak istiyorsun? 😂`
      )
      .setFooter({
        text: message.member.displayName,
        iconURL: message.author.displayAvatarURL({ dynamic: true }),
      })
      .setTimestamp();
    return message.channel.send({ embeds: [sembed] });
  }

  const embed = new MessageEmbed()
    .setColor("GREEN")
    .setDescription(
      `${emojis.bot.succes} | **${message.member.displayName}**, ${member} şöyle dedi:\n\n**${roast}**`
    )
    .setFooter({
      text: member.displayName,
      iconURL: member.user.displayAvatarURL({ dynamic: true }),
    })
    .setTimestamp();

  return message.channel.send({ embeds: [embed] });
};

exports.help = {
  name: "roast",
  aliases: ["dalga", "sataş"],
  usage: "roast [@kullanıcı]",
  description: "Bir kullanıcıyı rastgele bir espriyle kızdırır.",
  category: "Eğlence",
  cooldown: 5,
};
