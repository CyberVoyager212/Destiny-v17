const axios = require("axios");
const { MessageEmbed } = require("discord.js");
const emojis = require("../emoji.json");

exports.help = {
  name: "korkuhikayesi",
  aliases: ["korku", "horror"],
  usage: "korkuhikayesi",
  description: "Yapay zeka tarafından kısa bir korku hikayesi anlatır.",
  category: "Eğlence",
  cooldown: 20,
};

async function getHorrorStory(API_KEY) {
  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "z-ai/glm-4.5-air:free",
        messages: [
          {
            role: "system",
            content:
              "Kısa, ürkütücü ve akılda kalıcı bir korku hikayesi yaz. Sadece hikayeyi yaz, başka bir şey ekleme.",
          },
          { role: "user", content: "Bana korku hikayesi anlat." },
        ],
        max_tokens: 1000,
        temperature: 0.8,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
        },
      }
    );

    if (
      !response.data.choices ||
      !response.data.choices[0].message ||
      !response.data.choices[0].message.content
    ) {
      return "Karanlıkta bir ses duydum, ama sesin sahibi yoktu...";
    }

    return response.data.choices[0].message.content.trim();
  } catch {
    return null;
  }
}
exports.execute = async (client, message, args) => {
  try {
    const story = await getHorrorStory(client.config.OPENROUTER_API_KEY);
    if (!story) {
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, huhu~ korku hikayesi alamadım, sanırım karanlıkta kayboldum :c`
      );
    }

    const embed = new MessageEmbed()
      .setTitle(`${emojis.bot.succes} Korku Hikayesi`)
      .setDescription(story)
      .setColor("#8B0000")
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  } catch (err) {
    console.error("Korku Hikayesi Komutu Hatası:", err);
    message.reply(
      `${emojis.bot.error} | Ayyaa~ bir şeyler ters gitti **${message.member.displayName}**... tekrar deneyebilir misin? :c`
    );
  }
};
