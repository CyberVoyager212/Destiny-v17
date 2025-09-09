const { MessageEmbed } = require("discord.js");
const emojis = require("../emoji.json");

exports.execute = async (client, message, args) => {
  try {
    if (!message.guild) {
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, burası bir sunucu değil qwq~ \n> Bu büyü sadece sunucularda çalışıyor desu~`
      );
    }

    const owner = await message.guild.fetchOwner().catch(() => null);
    if (!owner) {
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, sunucunun sahibini bulamadım :c \n> Belki de sihirli ipler koptu...`
      );
    }

    const embed = new MessageEmbed()
      .setTitle(`${emojis.bot.succes} | ${message.guild.name} Bilgileri`)
      .setThumbnail(message.guild.iconURL({ dynamic: true }))
      .addField("🆔 ID", message.guild.id, true)
      .addField("👑 Sahibi", `<@${owner.id}>`, true)
      .addField("👥 Üyeler", `${message.guild.memberCount}`, true)
      .addField("📅 Oluşturulma", message.guild.createdAt.toLocaleDateString("tr-TR"), true)
      .addField("🎭 Roller", `${message.guild.roles.cache.size}`, true)
      .addField("🚀 Boost", `${message.guild.premiumSubscriptionCount}`, true)
      .setColor("BLUE")
      .setTimestamp();

    message.channel.send({ embeds: [embed] }).catch(() => {
      message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, bilgileri göndermeyi başaramadım uwu~ \n> Sanırım kanalda embed göndermeme izin verilmiyor :<`
      );
    });
  } catch (err) {
    message.reply(
      `${emojis.bot.error} | **${message.member.displayName}**, işler biraz karıştı qwq~ \n> Hata: \`${err.message}\``
    );
  }
};

exports.help = {
  name: "sunucubilgi",
  aliases: ["sb"],
  usage: "sunucubilgi",
  description: "Sunucunun temel bilgilerini gösterir.",
  category: "Moderasyon",
  cooldown: 5,
};
