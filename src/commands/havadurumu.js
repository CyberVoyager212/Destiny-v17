const fetch = require("node-fetch");
const emojis = require("../emoji.json");

exports.help = {
  name: "hava",
  aliases: [],
  usage: "hava <şehir>",
  description: "Belirtilen şehir için 7 günlük hava tahminini gösterir.",
  category: "Araçlar",
  cooldown: 10,
};

exports.execute = async (client, message, args) => {
  try {
    if (!args.length) {
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, lütfen bir şehir adı gir~ bana göre çok hızlısın :c`
      );
    }

    const city = args.join(" ");
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      city
    )}&count=1&language=tr&format=json`;

    const geoResponse = await fetch(geoUrl);
    const geoData = await geoResponse.json();

    if (!geoData.results || geoData.results.length === 0) {
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, şehir bulunamadı~ lütfen geçerli bir şehir gir :c`
      );
    }

    const { latitude, longitude, name, country } = geoData.results[0];
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=Europe/Istanbul&lang=tr`;

    const weatherResponse = await fetch(weatherUrl);
    const weatherData = await weatherResponse.json();

    let weatherMessage = `${emojis.bot.succes} | **${message.member.displayName}**, ☁️ **${name}, ${country} - 7 Günlük Hava Tahmini:**\n\n`;

    for (let i = 0; i < weatherData.daily.time.length; i++) {
      weatherMessage += `📅 **${weatherData.daily.time[i]}**\n🌡️ Maks: ${weatherData.daily.temperature_2m_max[i]}°C, Min: ${weatherData.daily.temperature_2m_min[i]}°C\n☔ Yağış: ${weatherData.daily.precipitation_sum[i]} mm\n\n`;
    }

    message.channel.send(weatherMessage);
  } catch (error) {
    console.error("Hava durumu komutunda hata oluştu:", error);
    return message.reply(
      `${emojis.bot.error} | **${message.member.displayName}**, ayy~ hava durumu alınırken bir sorun oluştu :c`
    );
  }
};
