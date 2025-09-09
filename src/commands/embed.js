const { MessageEmbed, Permissions } = require("discord.js");
const emojis = require("../emoji.json"); // emoji verilerini içe aktar

module.exports.execute = async (client, message, args) => {
  try {
    // Yetki kontrolü
    if (!message.member.permissions.has(Permissions.FLAGS.MANAGE_MESSAGES)) {
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, bu komutu kullanmak için 'Mesajları Yönet' yetkisine sahip olmalısın~ :c`
      );
    }

    // Kanal etiketlendi mi?
    const channelMention = message.mentions.channels.first();
    if (!channelMention) {
      return message.reply(
        `${emojis.bot.error} | ℹ**${message.member.displayName}**, lütfen embed mesajını göndermek istediğin kanalı etiketle~`
      );
    }

    const filter = (m) => m.author.id === message.author.id;

    // Başlık al
    await message.channel.send(
      `${emojis.bot.succes} | **${message.member.displayName}**, embed için bir başlık gir. _(iptal için 'iptal' yazabilirsin)_`
    );
    const titleMsg = await message.channel.awaitMessages({
      filter,
      max: 1,
      time: 30000,
      errors: ["time"],
    });
    const title = titleMsg.first().content;
    if (title.toLowerCase() === "iptal")
      return message.channel.send(`${emojis.bot.error} | ❌ İşlem iptal edildi~`);

    // Açıklama al
    await message.channel.send(
      `${emojis.bot.succes} | **${message.member.displayName}**, şimdi açıklamayı gir. _(iptal için 'iptal' yazabilirsin)_`
    );
    const descMsg = await message.channel.awaitMessages({
      filter,
      max: 1,
      time: 30000,
      errors: ["time"],
    });
    const description = descMsg.first().content;
    if (description.toLowerCase() === "iptal")
      return message.channel.send(`${emojis.bot.error} | ❌ İşlem iptal edildi~`);

    // Renk oluştur
    const randomColor = `#${Math.floor(Math.random() * 0xffffff)
      .toString(16)
      .padStart(6, "0")}`;

    // Embed oluştur
    const embed = new MessageEmbed()
      .setTitle(title)
      .setDescription(description)
      .setColor(randomColor)
      .setFooter({
        text: `Oluşturan: ${message.member.displayName}`,
        iconURL: message.author.displayAvatarURL({ dynamic: true }),
      })
      .setTimestamp();

    // Gönder
    await channelMention.send({ embeds: [embed] });
    await message.channel.send(
      `${emojis.bot.succes} | **${message.member.displayName}**, embed başarıyla ${channelMention} kanalına gönderildi!`
    );
  } catch (err) {
    console.error("Embed komutu hatası:", err);
    return message.reply(
      `${emojis.bot.error} | **${message.member.displayName}**, bir hata oluştu veya işlem zaman aşımına uğradı~ Lütfen tekrar dene :c`
    );
  }
};

module.exports.help = {
  name: "embed",
  aliases: ["embedyap", "embedolustur"],
  usage: "embed #kanal",
  description: "Verilen kanalda bir embed mesajı oluşturur.",
  category: "Araçlar",
  cooldown: 5,
  permissions: ["MANAGE_MESSAGES"],
};
