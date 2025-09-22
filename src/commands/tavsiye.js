const fetch = require("node-fetch");
const emojis = require("../emoji.json");

exports.help = {
  name: "tavsiye",
  aliases: ["öneri", "advice"],
  usage: "tavsiye <soru veya konu>",
  description: "Yapay zekadan tavsiye veya öneri alırsınız.",
  category: "Eğlence",
  cooldown: 10,
};
async function fetchAdviceFromOpenRouter(apiKey, userInput, botName) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "z-ai/glm-4.5-air:free",
      messages: [
        {
          role: "system",
          content:
            "Sen yardımcı, bilgili ve kibar bir tavsiye botusun. Kullanıcının sorusuna veya isteğine uygun, kısa ve net tavsiyeler veriyorsun. Gereksiz uzunluk yapma, direkt tavsiye ver.",
        },
        {
          role: "user",
          content: userInput,
        },
      ],
      max_tokens: 300,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`İstek başarısız oldu: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.choices || !data.choices[0]?.message?.content) {
    throw new Error("OpenRouter’den geçerli bir içerik gelmedi.");
  }

  return data.choices[0].message.content.trim();
}

exports.execute = async (client, message, args) => {
  if (!args.length) {
    return message.reply(
      `${emojis.bot.error} | **${message.member.displayName}**, bana ne hakkında tavsiye istediğini söylemezsen sihir yapamam qwq~`
    );
  }

  try {
    const OPENROUTER_API_KEY = client.config.OPENROUTER_API_KEY;
    if (!OPENROUTER_API_KEY) {
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, büyü kaynağım kayıp görünüyor :c \n> OpenRouter API anahtarı ayarlanmamış!`
      );
    }

    const userInput = args.join(" ");
    const advice = await fetchAdviceFromOpenRouter(
      OPENROUTER_API_KEY,
      userInput,
      client.user.username
    );

    const embed = {
      title: `${emojis.bot.succes} | Tavsiyeniz`,
      description: advice,
      color: 0x00cccc,
      footer: { text: `${client.user.username} Tavsiye Botu` },
      timestamp: new Date(),
    };

    return message.channel.send({ embeds: [embed] });
  } catch (error) {
    console.error(error);
    return message.reply(
      `${emojis.bot.error} | **${message.member.displayName}**, tavsiyeni getirirken işler karıştı qwq~ \n> Hata: \`${error.message}\`\nBirazdan tekrar dene olur mu? >w<`
    );
  }
};
