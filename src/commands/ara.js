const axios = require("axios");
const emojis = require("../emoji.json");
const { SERPER_API_KEY } = require("../botConfig");

exports.help = {
  name: "webde-ara",
  aliases: ["ara", "web-ara"],
  usage: "webde ara [sorgu]",
  description: "Google üzerinden arama yaparak sonuçları getirir.",
  category: "Araçlar",
  cooldown: 5,
};

exports.execute = async (client, message, args) => {
  const query = args.join(" ");
  if (!query) {
    return message.channel.send(
      `${emojis.bot.error} | **${message.member.displayName}**, lütfen aramak istediğin ifadeyi yaz~ :c`
    );
  }

  let loadingMessage;
  try {
    loadingMessage = await message.channel.send(
      `${emojis.bot.succes} | 🔎 **${message.member.displayName}**, arama yapılıyor... biraz bekle~`
    );

    const response = await axios.post(
      "https://google.serper.dev/search",
      { q: query },
      { headers: { "X-API-KEY": SERPER_API_KEY } }
    );

    const results = response.data.organic;
    if (!results || results.length === 0) {
      await loadingMessage.edit(
        `${emojis.bot.error} | **${message.member.displayName}**, arama sonucunda hiçbir şey bulunamadı~ 😢`
      );
      return;
    }

    let resultMessage = `**"${query}" için arama sonuçları**:\n`;
    results.slice(0, 10).forEach((result, index) => {
      resultMessage += `**${index + 1}.** ${result.title}\n${result.snippet}\n[Bağlantı](${result.link})\n\n`;
    });

    const chunks = splitIntoChunks(resultMessage, 2000);

    for (const chunk of chunks) {
      await message.channel.send(chunk);
    }

    // Başarı mesajını anime-style ver
    await loadingMessage.edit(
      `${emojis.bot.succes} | **${message.member.displayName}**, arama tamamlandı! 🎉`
    );

    // Mesajdan tüm eklemleri kaldır (embed, attachments vs)
    if (loadingMessage.deletable) {
      setTimeout(() => loadingMessage.delete().catch(() => {}), 5000);
    }

  } catch (error) {
    console.error(error);
    if (loadingMessage?.deletable) loadingMessage.delete().catch(() => {});
    return message.channel.send(
      `${emojis.bot.error} | **${message.member.displayName}**, arama sırasında bir hata oluştu~ 😢 Lütfen tekrar dene!`
    );
  }
};

function splitIntoChunks(text, maxLength) {
  const chunks = [];
  let currentChunk = "";

  const words = text.split(" ");
  for (const word of words) {
    if ((currentChunk + word).length > maxLength) {
      chunks.push(currentChunk.trim());
      currentChunk = word + " ";
    } else {
      currentChunk += word + " ";
    }
  }

  if (currentChunk.trim()) chunks.push(currentChunk.trim());
  return chunks;
}
