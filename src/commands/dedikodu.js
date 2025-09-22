const { MessageEmbed } = require("discord.js");
const axios = require("axios");
const botConfig = require("../botConfig.js");
const emojis = require("../emoji.json");

module.exports.help = {
  name: "dedikodu",
  aliases: ["gossip"],
  usage: "dedikodu <kullanıcı>",
  description: "Belirtilen kullanıcı hakkında rastgele bir dedikodu üretir.",
  category: "Eğlence",
  cooldown: 10,
};
module.exports.execute = async (client, message, args) => {
  const targetUser = args.join(" ");
  if (!targetUser)
    return message.reply(
      `${emojis.bot.error} | Ahh~ kim hakkında dedikodu yapacağımı yazmayı unuttun, **${message.member.displayName}** :c`
    );

  const prompt = `${targetUser} hakkında kısa, eğlenceli ve tamamen hayali türkçe bir dedikodu yaz. sadece dedikoduyu yaz.`;

  try {
    const aiRes = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "z-ai/glm-4.5-air:free",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 2000,
        temperature: 0.7,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${botConfig.OPENROUTER_API_KEY}`,
        },
      }
    );

    const aiReply = aiRes.data.choices[0].message.content;
    const embed = new MessageEmbed()
      .setTitle(`${emojis.bot.succes} Dedikodu 🗣️ ${targetUser}`)
      .setDescription(aiReply)
      .setColor("RANDOM")
      .setFooter({ text: `Dedikodu isteyen: ${message.author.tag}` });

    message.channel.send({ embeds: [embed] });
  } catch (err) {
    console.error("Dedikodu komutu hatası:", err);
    message.reply(
      `${emojis.bot.error} | Uuups! Dedikodu yapmak için kullandığım sihir bozuldu 😵 Lütfen tekrar dene~`
    );
  }
};
