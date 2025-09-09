const { Client, Message } = require("discord.js");
const emojis = require("../emoji.json");

module.exports.help = {
  name: "nuke",
  aliases: ["clearall", "purgeall"],
  description: "Kanalda bulunan tüm mesajları siler ve kanalı sıfırlar.",
  usage: "nuke",
  category: "Moderasyon",
  cooldown: 10,
  permissions: ["MANAGE_CHANNELS"],
};

module.exports.execute = async (bot, message, args) => {
  if (!message.member.permissions.has("MANAGE_CHANNELS")) {
    return message.channel.send(
      `${emojis.bot.error} | **${message.member.displayName}**, bu komutu kullanmak için \`Kanalları Yönet\` yetkisine sahip olmalısın~ >.<`
    );
  }

  let channel = message.channel;

  try {
    const msg = await message.channel.send(
      `⏱ | **${message.member.displayName}**, kanal temizleniyor... biraz sabret~ >w<`
    );

    const newChannel = await channel.clone();
    await channel.delete();

    // Nukelendi bilgisi veritabanına kaydediliyor
    await bot.db.set(`nuked_${newChannel.id}`, {
      nukedBy: message.author.id,
      nukedAt: Date.now(),
    });

    await newChannel.send(
      `${emojis.bot.succes} | # **Nuked by ${message.author.username}** 🎉✨\nKanal tamamen temizlendi~`
    );
  } catch (err) {
    console.error("Nuke komutu hata:", err);
    return message.channel.send(
      `${emojis.bot.error} | **${message.member.displayName}**, uf! Kanal nukelenirken bir sorun çıktı... tekrar dene >.<`
    );
  }
};
