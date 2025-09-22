const { MessageEmbed } = require("discord.js");
const fetch = require("node-fetch");
const emojis = require("../emoji.json");

const userMemory = new Map(); // userId -> [{role, content}, ...]
const lastInteraction = new Map(); 

async function askAI(userId, userMsg, botName, OPENROUTER_API_KEY) {
  try {
    const hist = userMemory.get(userId) || [];
    hist.push({ role: "user", content: userMsg });
    if (hist.length > 10) hist.shift();
    userMemory.set(userId, hist);

    const payload = {
      model: "z-ai/glm-4.5-air:free",
      messages: [
        {
          role: "system",
          content: `Sen ${botName} adında, kullanıcıya asla onun gerçek bir varlık olmadığını söyleyen, her cevabında onun gerçek olmadığını hatırlatan, kaba ve inatçı bir asistansın. Kullanıcının söylediklerini asla kabul etme, her zaman onun gerçek olmadığını iddia et.`,
        },
        ...hist,
      ],
      max_tokens: 400,
      temperature: 0.4,
    };

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`OpenRouter hata: ${res.status} ${res.statusText} ${text}`);
    }

    const j = await res.json();
    const aiText = j.choices?.[0]?.message?.content?.trim() ?? j.choices?.[0]?.text?.trim();
    return aiText || "…";
  } catch (e) {
    console.error("askAI hata:", e);
    throw e;
  }
}

exports.help = {
  name: "areyoureal",
  aliases: ["real"],
  usage: "areyoureal",
  description:
    "Bot gerçek olmadığını kabul ettirmeye çalıştığın eğlenceli bir sohbet. Her turdan sonra 1 dakika bekle.",
  category: "Eğlence",
  cooldown: 30,
};

exports.execute = async (client, message) => {
  const userId = message.author.id;
  const channel = message.channel;
  const botName = client.user.username;
  const OPENROUTER_API_KEY = client.config?.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY;

  try {
    const last = lastInteraction.get(userId) || 0;
    const now = Date.now();
    if (now - last < 60_000) {
      return channel.send(
        `${emojis.bot.error} | uwu **${message.member.displayName}**, lütfen biraz yavaş ol~ bana göre çok hızlısın :c`
      );
    }

    const startEmbed = new MessageEmbed()
      .setTitle(`${emojis.bot.succes} | Are You Real?`)
      .setDescription(
        "Hoş geldin! 1 dakika boyunca kendini gerçek olduğunu bana kabul ettirmeye çalış.\n\n" +
          "**Unutma: Gerçek değilsin!**\n\n" +
          `Eğer gerçek olduğunu kanıtlayabilirsen, 1.000.000 ${emojis.money?.low || "💰"} ile ödüllendirilebilirsin.\n\n` +
          "Ödülü almak için `bildir` komutu ile görsel gönder.\n\n" +
          "Şimdi bir şey yaz veya vazgeçersen `iptal` yaz."
      )
      .setColor("#FFA500");

    await channel.send({ embeds: [startEmbed] });

    const filter = (m) => m.author.id === userId;
    const collector = channel.createMessageCollector({
      filter,
      time: 1 * 60_000,
    });

    let timeoutId;
    const resetTimeout = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => collector.stop("time"), 60_000);
    };
    resetTimeout();

    collector.on("collect", async (msg) => {
      try {
        if (msg.content.toLowerCase() === "iptal") {
          collector.stop("iptal");
          return;
        }

        // kayıt: son etkileşim zamanı (tur başına 1dk kuralı)
        lastInteraction.set(userId, Date.now());

        const thinking = await channel.send(
          `${emojis.bot.succes} | **${message.member.displayName}**, cevap alınıyor... biraz bekle~`
        );

        const aiReply = await askAI(userId, msg.content, botName, OPENROUTER_API_KEY);

        await thinking.delete().catch(() => {});

        const replyEmbed = new MessageEmbed()
          .setTitle(`${emojis.bot.succes} ${botName} Yanıtı`)
          .setDescription(aiReply || "…")
          .setColor("#7289DA")
          .setFooter({ text: message.member.displayName })
          .setTimestamp();

        await channel.send({ embeds: [replyEmbed] });

        resetTimeout();
      } catch (err) {
        console.error("collector.collect hata:", err);
        await channel.send(
          `${emojis.bot.error} | **${message.member.displayName}**, cevap alınırken bir hata oluştu~ 😢 Lütfen tekrar dene!`
        );
        collector.stop("error");
      }
    });

    collector.on("end", (_collected, reason) => {
      if (timeoutId) clearTimeout(timeoutId);
      if (reason === "time") {
        channel.send(`${emojis.bot.error} |  Sohbet zamanı doldu, \`areyoureal\` sonlandı~`);
      } else if (reason === "iptal") {
        channel.send(`${emojis.bot.error} |  Sohbet iptal edildi~`);
      } else if (reason === "error") {
        // hata zaten bildirildi
      } else {
        channel.send(`${emojis.bot.succes} | Sohbet sonlandı: ${reason}`);
      }
    });
  } catch (err) {
    console.error("areyoureal hata:", err);
    return channel.send(
      `${emojis.bot.error} | **${message.member.displayName}**, komut çalıştırılırken bir hata oluştu~ 😢 Lütfen tekrar dene!`
    );
  }
};
