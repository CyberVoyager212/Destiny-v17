// kanalsil.js
const { MessageEmbed } = require("discord.js");
const emojis = require("../emoji.json");

exports.help = {
  name: "kanalsil",
  aliases: [],
  usage: "kanalsil <#kanal|id|isim> [başka_kanal...]",
  description: "Belirtilen METİN kanallarını siler.",
  category: "Moderasyon",
  cooldown: 5,
  permissions: ["MANAGE_CHANNELS"],
};

exports.execute = async (client, message, args) => {
  if (!message.member.permissions.has("MANAGE_CHANNELS")) {
    return message.reply(
      `${emojis.bot.error} | **${message.member.displayName}**, üzgünüm ama bu büyüyü kullanmak için gerekli güce sahip değilsin~ :c`
    );
  }

  if (!args.length) {
    return message.reply(
      `${emojis.bot.error} | **${message.member.displayName}**, silmek istediğin kanalları yazmayı unuttun... >w<`
    );
  }

  const deleted = [];
  for (const target of args) {
    const kanal =
      message.mentions.channels.first() ||
      message.guild.channels.cache.get(target) ||
      message.guild.channels.cache.find((c) => c.name === target);

    if (!kanal || kanal.type !== "GUILD_TEXT") {
      message.channel.send(
        `${emojis.bot.error} | **${message.member.displayName}**, "${target}" isminde bir kanal bulamadım ya da bu bir metin kanalı değil... owo`
      );
      continue;
    }

    try {
      await kanal.delete("Komut ile kanal silindi");
      deleted.push(kanal.name);
    } catch (e) {
      console.error("⚠️ kanalsil hata:", e);
      message.channel.send(
        `${emojis.bot.error} | **${message.member.displayName}**, "${kanal.name}" kanalını silerken elim ayağıma dolaştı... yardım et! >_<`
      );
    }
  }

  if (deleted.length > 0) {
    const embed = new MessageEmbed()
      .setDescription(
        `${emojis.bot.succes} | **${message.member.displayName}**, işte başarıyla sildiğim kanallar: ✨\n\`${deleted.join(
          "`, `"
        )}\``
      )
      .setColor("#FF4C4C")
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  } else {
    return message.reply(
      `${emojis.bot.error} | **${message.member.displayName}**, hiçbir kanal silinemedi... biraz daha dikkatli dener misin? :c`
    );
  }
};
