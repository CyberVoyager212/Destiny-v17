const axios = require("axios");
const { MessageEmbed } = require("discord.js");
const emojis = require("../emoji.json");

exports.help = {
  name: "isimtesti",
  aliases: ["isim-anlam", "adtest"],
  usage: "isimtesti <isim>",
  description: "Girilen ismin anlamını yapay zeka ile öğrenir.",
  category: "Eğlence",
  cooldown: 10,
};
async function fetchNameMeaning(name, API_KEY) {
  const response = await axios.post(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      model: "z-ai/glm-4.5-air:free",
      messages: [
        {
          role: "user",
          content: `Bana "${name}" isminin anlamını söyle. ekstra bişey ekleme sadece bu ismin anlamını söyle bir fikrin yoksa rastgele bişi söyle`,
        },
      ],
      max_tokens: 2000,
      temperature: 0.4,
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
    return null;
  }

  return response.data.choices[0].message.content.trim();
}

exports.execute = async (client, message, args) => {
  const name = args.join(" ");
  if (!name)
    return message.reply(
      `${emojis.bot.error} | **${message.member.displayName}**, bana bir isim vermelisin yoksa sihrimi kullanamam~ :c`
    );

  try {
    const meaning = await fetchNameMeaning(
      name,
      client.config.OPENROUTER_API_KEY
    );

    if (!meaning) {
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, bu ismin anlamını bulamadım... belki de çok gizemli bir isim >///<`
      );
    }

    const embed = new MessageEmbed()
      .setTitle(`${emojis.bot.succes} | 📖 "${name}" İsminin Anlamı`)
      .setDescription(meaning)
      .setColor("#4B0082")
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  } catch (err) {
    console.error(err);
    message.reply(
      `${emojis.bot.error} | ⏱ **${message.member.displayName}**, isim anlamını alırken bir şeyler ters gitti... biraz yavaş ol lütfen~ bana göre çok hızlısın :c`
    );
  }
};
