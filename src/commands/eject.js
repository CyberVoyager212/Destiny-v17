const { MessageEmbed } = require("discord.js");
const fetch = require("node-fetch");
const emojis = require("../emoji.json"); // emoji verilerini içe aktar

module.exports.help = {
  name: "eject",
  aliases: ["ejected", "impostor"],
  description: "Belirtilen kullanıcıyı Among Us tarzında uzaya fırlatır.",
  usage: "eject [@kullanıcı]",
  category: "Eğlence",
  cooldown: 3,
};

module.exports.execute = async (client, message, args) => {
  try {
    const userMember =
      message.mentions.members.first() ||
      message.guild.members.cache.find((m) =>
        m.displayName.toLowerCase().includes(args.join(" ").toLowerCase())
      ) ||
      message.member;

    const user = userMember.user;

    const isImpostor = Math.random() < 0.5;

    const colors = [
      "black","blue","brown","cyan","darkgreen","lime",
      "orange","pink","purple","red","white","yellow",
    ];
    const crewmateColor = colors[Math.floor(Math.random() * colors.length)];

    const apiUrl = `https://vacefron.nl/api/ejected?name=${encodeURIComponent(
      user.username
    )}&impostor=${isImpostor}&crewmate=${crewmateColor}`;

    const res = await fetch(apiUrl);
    if (!res.ok) throw new Error(`API hatası: ${res.status} ${res.statusText}`);

    const embed = new MessageEmbed()
      .setAuthor({
        name: `${message.member.displayName}`,
        iconURL: message.author.displayAvatarURL({ dynamic: true }),
      })
      .setTitle(`${emojis.bot.succes} 🛸 ${userMember.displayName} uzaya fırlatıldı!`)
      .setDescription(
        `${userMember.displayName} ${
          isImpostor ? "**bir impostordu.** 😈" : "**bir impostor değildi.** 😇"
        }`
      )
      .setImage(res.url)
      .setColor("RANDOM");

    return message.channel.send({ embeds: [embed] });
  } catch (error) {
    console.error("Eject komut hatası:", error);

    const embedError = new MessageEmbed()
      .setTitle(`${emojis.bot.error} ❌ Hata Oluştu!`)
      .setDescription(
        `⏱ | **${message.member.displayName}**, uzaya fırlatma işlemi başarısız oldu~\nBelki kullanıcı adı çok uzun veya özel karakter içeriyordur :c`
      )
      .setColor("RED");

    return message.channel.send({ embeds: [embedError] });
  }
};
