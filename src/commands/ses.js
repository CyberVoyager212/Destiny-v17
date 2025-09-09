const { Permissions } = require("discord.js");
const { joinVoiceChannel, getVoiceConnection } = require("@discordjs/voice");
const emojis = require("../emoji.json");

exports.execute = async (client, message, args) => {
  try {
    if (!message.member.permissions.has(Permissions.FLAGS.MANAGE_GUILD))
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, üzgünüm ama bunu yapmak için Sunucuyu Yönet yetkin yok~ :c`
      );

    const sub = args[0]?.toLowerCase();
    const dbKey = `autoVC_${message.guild.id}`;

    if (sub === "status") {
      const data = await client.db.get(dbKey);
      if (data?.id) {
        const chan = message.guild.channels.cache.get(data.id);
        return message.reply(
          `${emojis.bot.succes} | **${message.member.displayName}**, otomatik katılma şu anda **${chan?.name || data.id}** kanalına ayarlı! ✨`
        );
      } else {
        return message.reply(
          `${emojis.bot.error} | **${message.member.displayName}**, otomatik katılma şu anda kapalı~ :c`
        );
      }
    }

    if (!["join", "leave"].includes(sub)) {
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, geçerli alt komut kullan: \`vc join\`, \`vc leave\` veya \`vc status\`~ :c`
      );
    }

    if (sub === "join") {
      const channel = message.member.voice.channel;
      if (!channel)
        return message.reply(
          `${emojis.bot.error} | **${message.member.displayName}**, önce bir ses kanalına katılmalısın~ :c`
        );
      try {
        joinVoiceChannel({
          channelId: channel.id,
          guildId: channel.guild.id,
          adapterCreator: channel.guild.voiceAdapterCreator,
        });
        await client.db.set(dbKey, { id: channel.id, name: channel.name });
        return message.channel.send(
          `${emojis.bot.succes} | **${message.member.displayName}**, **${channel.name}** kanalına katıldım ve otomatik katılma aktif! ✨`
        );
      } catch (err) {
        console.error(err);
        return message.reply(
          `${emojis.bot.error} | **${message.member.displayName}**, ses kanalına katılırken bir sorun oluştu~ :c`
        );
      }
    }

    // leave
    try {
      await client.db.delete(dbKey);
      const conn = getVoiceConnection(message.guild.id);
      if (conn) conn.destroy();
      return message.channel.send(
        `${emojis.bot.succes} | **${message.member.displayName}**, otomatik katılma devre dışı bırakıldı ve bağlantı kesildi! ✨`
      );
    } catch (err) {
      console.error(err);
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, ses kanalından çıkarken bir sorun oluştu~ :c`
      );
    }
  } catch (error) {
    console.error("⚠️ | vc komutu çalıştırılırken hata oluştu:", error);
    return message.reply(
      `${emojis.bot.error} | **${message.member.displayName}**, uf! Bir hata oluştu, tekrar dene~ :c`
    );
  }
};

exports.help = {
  name: "vc",
  aliases: ["ses"],
  usage: "vc <join|leave|status>",
  description:
    "join: otomatik katılmayı ayarla / leave: kapat / status: hangi kanala katılacağını gösterir",
  category: "Araçlar",
  cooldown: 5,
  permissions: ["MANAGE_GUILD"],
};
