const { MessageEmbed, Util } = require("discord.js");
const emojis = require("../emoji.json");

exports.execute = async (bot, message, args) => {
  if (!message.member.permissions.has("MANAGE_EMOJIS_AND_STICKERS")) {
    return message.channel.send(
      `${emojis.bot.error} | **${message.member.displayName}**, maalesef bu komutu kullanmak için Emojileri Yönet yetkisine sahip olman gerekiyor!`
    );
  }

  if (!message.guild.me.permissions.has("MANAGE_EMOJIS_AND_STICKERS")) {
    return message.channel.send(
      `${emojis.bot.error} | **${message.member.displayName}**, emoji ekleyebilmem için bana Emojileri Yönet yetkisi ver~ 😢`
    );
  }

  const emoji = args[0];
  if (!emoji) {
    return message.channel.send(
      `${emojis.bot.error} | **${message.member.displayName}**, lütfen eklemek istediğin emojiyi gir! ⏱`
    );
  }

  const customemoji = Util.parseEmoji(emoji);

  if (customemoji?.id) {
    const link = `https://cdn.discordapp.com/emojis/${customemoji.id}.${
      customemoji.animated ? "gif" : "png"
    }`;
    const name = args.slice(1).join(" ") || customemoji.name;

    try {
      const newEmoji = await message.guild.emojis.create(link, name);
      const embed = new MessageEmbed()
        .setTitle(`${emojis.bot.succes} Emoji Eklendi!`)
        .setColor("RANDOM")
        .setDescription(
          `${emojis.bot.succes} | **${message.member.displayName}**, emoji başarıyla sunucuya eklendi!\n**Adı:** ${newEmoji.name}\n[Önizleme](${link})`
        );

      return message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      return message.channel.send(
        `${emojis.bot.error} | **${message.member.displayName}**, emoji eklenirken bir hata oluştu! Slotlar dolu olabilir ya da bir şeyler ters gitti~ 😵`
      );
    }
  } else {
    return message.channel.send(
      `${emojis.bot.error} | **${message.member.displayName}**, bu emoji zaten sunucuda mevcut, tekrar eklemene gerek yok! 🫠`
    );
  }
};

exports.help = {
  name: "addemoji",
  aliases: ["emoji-ekle", "emote-ekle"],
  usage: "addemoji <emoji>",
  description: "Belirtilen özel emojiyi sunucuya ekler.",
  category: "Moderasyon",
  cooldown: 5,
  permissions: ["MANAGE_EMOJIS_AND_STICKERS"],
};
