const { MessageAttachment } = require("discord.js");
const fetch = require("node-fetch");
const emojis = require("../emoji.json");

exports.execute = async (client, message, args) => {
  const konum = args.join(" ");

  if (!konum) {
    return message.reply(
      `${emojis.bot.error} | **${message.member.displayName}**, bana bir konum vermelisin yoksa haritayı nasıl bulayım ki... qwq`
    );
  }

  const site = `https://maps.google.com/?q=${encodeURIComponent(konum)}`;

  try {
    const msg = await message.channel.send({
      content: `⏳ | **${message.member.displayName}**, harita hazırlanıyor~ biraz sabırlı ol lütfen >w<`,
    });

    const res = await fetch(
      `https://image.thum.io/get/width/1920/crop/675/noanimate/${site}`
    );
    const buffer = await res.buffer();

    if (!buffer || buffer.length < 100) {
      await msg.delete();
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, sanırım bu konumdan görsel çıkaramadım... başka bir şey denesek mi? :c`
      );
    }

    const attachment = new MessageAttachment(buffer, `${konum}.png`);

    await msg.delete();
    return message.channel.send({
      content: `${emojis.bot.succes} | İşte istediğin harita görseli **${message.member.displayName}**~ umarım hoşuna gider! ✨`,
      files: [attachment],
    });
  } catch (err) {
    console.error("Hata:", err);
    return message.reply(
      `${emojis.bot.error} | Auu~ bir hata oldu **${message.member.displayName}**... sistemim sanırım sendeledi: \`${err.message}\` :c`
    );
  }
};

exports.help = {
  name: "harita",
  aliases: ["map", "konum", "lokasyon"],
  usage: "harita <konum>",
  description: "Belirtilen konumun Google Maps görüntüsünü gönderir.",
  category: "Araçlar",
  cooldown: 5,
};
