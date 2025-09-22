// commands/komik.js
const { MessageEmbed, MessageActionRow, MessageButton } = require("discord.js");
const fetch = require("node-fetch");
const translate = require("translate-google");
const emojis = require("../emoji.json");

exports.help = {
  name: "komik",
  aliases: ["caps", "guldur", "mizah"],
  usage: "komik",
  description:
    "Rastgele bir meme gönderir ve isteğe bağlı görüntüyü yapay zekaya açıklatır, ardından metni Türkçeye çevirir.",
  category: "Eğlence",
  cooldown: 5,
};
exports.execute = async (client, message, args) => {
  try {
    const res = await fetch("https://meme-api.com/gimme");
    const meme = await res.json();

    if (!meme || !meme.url) {
      return message.channel.send(
        `${emojis.bot.error} | **${message.member.displayName}**, meme bulamadım~ biraz sonra tekrar dener misin? :c`
      );
    }

    const embed = new MessageEmbed()
      .setTitle(meme.title || "Meme")
      .setURL(meme.postLink || "")
      .setColor("RANDOM")
      .setImage(meme.url)
      .setFooter({ text: `👍 ${meme.ups || 0} || 💬 ${meme.comment || 0}` });

    const row = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId("explain_image")
        .setLabel("Açıkla ve Çevir")
        .setStyle("PRIMARY")
    );

    const sentMessage = await message.channel.send({
      embeds: [embed],
      components: [row],
    });

    const filter = (interaction) =>
      interaction.customId === "explain_image" &&
      interaction.user.id === message.author.id;
    const collector = sentMessage.createMessageComponentCollector({
      filter,
      time: 60_000,
      max: 1,
    });

collector.on("collect", async (interaction) => {
  await interaction.deferReply({ ephemeral: true });
  try {
    // 1) Görsel açıklama (Mistral)
    const payload1 = {
      model: "mistralai/mistral-small-3.2-24b-instruct:free",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Bu gönderiyi anlamadım olay ne?",
            },
            { type: "image_url", image_url: { url: meme.url } },
          ],
        },
      ],
    };

    const aiRes1 = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${client.config.OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify(payload1),
    });

    const aiData1 = await aiRes1.json();
    const raw = aiData1.choices?.[0]?.message?.content 
              ?? aiData1.choices?.[0]?.text 
              ?? "Açıklama alınamadı.";

    // 2) Çıkan cevabı GPT-OSS-20B ile Türkçe, düzgün hale getirme
    const payload2 = {
      model: "openai/gpt-oss-20b:free",
      messages: [
        { role: "user",  content: `Aşağıdaki bozuk metni Türkçe, kısa, net ve anlaşılır şekilde yeniden yaz:\n\n${raw}`,
  },
      ],
    };

    const aiRes2 = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${client.config.OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify(payload2),
    });

    const aiData2 = await aiRes2.json();
    const refined = aiData2.choices?.[0]?.message?.content 
                 ?? aiData2.choices?.[0]?.text 
                 ?? raw;

    // 3) Kullanıcıya gönder
    await interaction.editReply({
      content: `${emojis.bot.succes} | **${message.member.displayName}**, işte senin için tatlı bir açıklama~\n\n${refined}`,
    });
  } catch (err) {
    console.error(err);
    await interaction.editReply({
      content: `${emojis.bot.error} | **${message.member.displayName}**, açıklama yaparken takıldım~ biraz nazik davran ve tekrar dene pls :c`,
    });
  }
});



    collector.on("end", () => {
      const disabledRow = new MessageActionRow().addComponents(
        new MessageButton()
          .setCustomId("explain_image")
          .setLabel("Açıkla")
          .setStyle("PRIMARY")
          .setDisabled(true)
      );
      sentMessage.edit({ components: [disabledRow] }).catch(() => {});
    });
  } catch (error) {
    console.error("Meme alma hatası:", error);
    return message.channel.send(
      `${emojis.bot.error} | **${message.member.displayName}**, aaah~ meme getirirken bir şeyler ters gitti :c`
    );
  }
};
