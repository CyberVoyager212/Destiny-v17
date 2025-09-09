const { MessageEmbed } = require("discord.js");
const emojis = require("../emoji.json"); // emoji.json yolunu kendi yapına göre ayarla

exports.execute = async (client, message, args) => {
  try {
    const gatewayLatency = Math.floor(client.ws.ping);
    const sentMsg = await message.channel.send("⏱ | **" + message.member.displayName + "**, ping ölçülüyor... bana göre biraz yavaş ol :c");

    const clientLatency = sentMsg.createdTimestamp - message.createdTimestamp;

    // Emoji seçimi clientLatency'e göre
  let emoji;
  if (clientLatency <= 80) {
    emoji = emojis.wifi["4"];
  } else if (clientLatency <= 150) {
    emoji = emojis.wifi["3"];
  } else if (clientLatency <= 300) {
    emoji = emojis.wifi["2"];
  } else {
    emoji = emojis.wifi["1"];
  }

    const embed = new MessageEmbed()
      .setTitle(`${emojis.bot.succes} | Pong!`)
      .setColor(
        clientLatency <= 80
          ? "#43B581"
          : clientLatency <= 150
          ? "#FAA61A"
          : "#F04747"
      )
      .addFields(
        { name: "API Latency", value: `${gatewayLatency}ms`, inline: true },
        {
          name: "Client Latency",
          value: `${clientLatency}ms ${emoji}`,
          inline: true,
        }
      )
      .setDescription(`✨ | **${message.member.displayName}**, bak işte bu kadar hızlı!`)
      .setTimestamp()
      .setFooter({
        text: `Requested by ${message.member.displayName}`,
        iconURL: message.author.displayAvatarURL({ dynamic: true }),
      });

    await sentMsg.edit({ content: null, embeds: [embed] });
  } catch (err) {
    console.error(err);
    message.channel.send(`${emojis.bot.error} | **${message.member.displayName}**, ping ölçülemiyor~ 😢 Lütfen biraz sabırlı ol!`);
  }
};

exports.help = {
  name: "ping",
  aliases: ["pong", "latency", "ms", "gecikme"],
  usage: "ping",
  category: "Bot",
  description:
    "Botun API ve istemci gecikmesini ölçer ve durumuna göre anime tarzı emoji ile gösterir.",
};
