const { MessageAttachment } = require("discord.js");
const fetch = require("node-fetch");
const emojis = require("../emoji.json");

module.exports.help = {
  name: "clyde",
  aliases: [],
  description: "Clyde botunun mesaj atmış gibi görünmesini sağlar.",
  usage: "clyde <mesaj>",
  category: "Eğlence",
  cooldown: 3,
};

module.exports.execute = async (client, message, args) => {
  const text = args.join(" ");
  if (!text) {
    return message.reply(
      `${emojis.bot.error} | Ahh… mesaj yazmayı unuttun sanırım 😢 Clyde ne yazacağını bekliyor~`
    );
  }

  const waitMsg = await message.channel.send(
    `✨ | ${message.member.displayName}, Clyde mesajını hazırlıyor, biraz sabret~`
  );

  try {
    const url = `https://nekobot.xyz/api/imagegen?type=clyde&text=${encodeURIComponent(
      text
    )}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data || !data.message) {
      return waitMsg.edit(
        `${emojis.bot.error} | Hımm… bir sorun çıktı, Clyde mesajı gelmedi 😵 Tekrar deneyebilirsin!`
      );
    }

    const attachment = new MessageAttachment(data.message, "clyde.png");
    await message.channel.send({
      content: `${emojis.bot.succes} | İşte Clyde’n hazır! Çok tatlı oldu bence 💖`,
      files: [attachment],
    });

    waitMsg.delete();
  } catch (err) {
    console.error("Clyde API hatası:", err);
    waitMsg.edit(
      `${emojis.bot.error} | Aaa~ bir hata oluştu! Sunucudaki teknoloji ruhları karıştı galiba 😵 Tekrar dene~`
    );
  }
};
