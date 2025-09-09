// kanalekle.js
const { MessageEmbed } = require("discord.js");
const emojis = require("../emoji.json");

exports.help = {
  name: "kanalekle",
  aliases: [],
  usage: "kanalekle <isim1> [isim2] [isim3] ...",
  description: "Belirtilen isimlerle 1 veya daha fazla METİN kanalı oluşturur.",
  category: "Moderasyon",
  cooldown: 5,
  permissions: ["MANAGE_CHANNELS"],
};

exports.execute = async (client, message, args) => {
  try {
    if (!message.member.permissions.has("MANAGE_CHANNELS")) {
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, bu büyüyü yapmak için gerekli güce sahip değilsin~ :c`
      );
    }

    if (!args.length) {
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, hmm... hangi kanalları yaratmam gerektiğini söylemedin >w<`
      );
    }

    const created = [];
    const failed = [];

    for (const isim of args) {
      try {
        const kanal = await message.guild.channels.create(isim, {
          type: "GUILD_TEXT",
          permissionOverwrites: [
            {
              id: message.guild.id,
              allow: ["VIEW_CHANNEL"],
            },
          ],
        });
        created.push(kanal.name);
      } catch (e) {
        console.error(e);
        failed.push(isim);
        message.channel.send(
          `${emojis.bot.error} | **${message.member.displayName}**, "${isim}" adlı kanalı oluştururken sihir ters tepki verdi~ >.<`
        );
      }
    }

    if (created.length > 0) {
      const embed = new MessageEmbed()
        .setDescription(
          `${emojis.bot.succes} | **${message.member.displayName}**, işte senin için yarattığım yeni kanallar~ ✨\n\n📂 ${created.join(
            ", "
          )}`
        )
        .setColor("#7D3C98")
        .setTimestamp();
      message.channel.send({ embeds: [embed] });
    }

    if (failed.length > 0) {
      message.channel.send(
        `${emojis.bot.error} | **${message.member.displayName}**, şu kanallar oluşturulamadı: ${failed.join(
          ", "
        )} :c`
      );
    }
  } catch (error) {
    console.error("⚠️ kanalekle komutu hata:", error);
    return message.reply(
      `${emojis.bot.error} | **${message.member.displayName}**, ahh~ sistemimde bir hata oluştu... biraz nefeslenip tekrar dener misin? >w<`
    );
  }
};
