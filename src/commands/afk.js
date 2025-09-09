const emojis = require("../emoji.json");

exports.help = {
  name: "afk",
  aliases: [],
  usage: "afk [sebep]",
  description: "AFK moduna girersiniz. Sebep belirtmek isteğe bağlıdır.",
  category: "Araçlar",
  cooldown: 5,
};

exports.execute = async (client, message, args) => {
  try {
    const sebep = args.join(" ") || null;
    const db = client.db;
    const afkKey = `afk_${message.author.id}`;
    const now = Date.now();

    await db.set(afkKey, { reason: sebep, start: now });

    return message.reply(
      `${emojis.bot.succes} | **${message.member.displayName}**, AFK moduna geçtin~ 💤${
        sebep ? ` Sebep: **${sebep}**` : ""
      }`
    );
  } catch (err) {
    console.error("AFK komutu hata:", err);
    return message.reply(
      `${emojis.bot.error} | **${message.member.displayName}**, AFK moduna geçerken bir hata oluştu~ 😢 Lütfen tekrar dene!`
    );
  }
};
