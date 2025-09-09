const { MessageEmbed } = require("discord.js");
const emojis = require("../emoji.json");

exports.execute = async (client, message, args) => {
  if (!message.member.permissions.has("BAN_MEMBERS")) {
    return message.reply(
      `${emojis.bot.error} | **${message.member.displayName}**, bu büyüyü kullanmaya yeteneğin yetmiyor~ \n> Yasaklama iznine ihtiyacın var desu~!`
    );
  }

  let user =
    message.mentions.members.first() ||
    message.guild.members.cache.get(args[0]) ||
    message.guild.members.cache.find(
      (m) => m.user.username.toLowerCase() === args[0]?.toLowerCase()
    );

  if (!user) {
    return message.reply(
      `${emojis.bot.error} | **${message.member.displayName}**, aradığın kişiyi bulamadım uwu~ \n> Belki de ismini yanlış yazdın? :3`
    );
  }

  if (!user.bannable) {
    return message.reply(
      `${emojis.bot.error} | **${message.member.displayName}**, bu kişiye dokunamıyorum~ \n> Gücü benden üstün görünüyor :c`
    );
  }

  let reason = args.slice(1).join(" ") || "Sebep belirtilmedi";
  let invite = await message.channel
    .createInvite({ maxAge: 0, maxUses: 1 })
    .catch(() => null);

  try {
    await user.send(
      `⚠️ | Sevgili **${user.user.tag}**, geçici olarak uzaklaştırıldın! \n Sebep: **${reason}** \n 🔗 Geri dönüş davetin: ${
        invite?.url || "Yok"
      }`
    );
  } catch (err) {
    message.channel.send(
      `${emojis.bot.error} | Ona mesaj gönderemedim... belki DM’leri kapalıdır :<`
    );
  }

  try {
    await message.guild.members.ban(user, { reason, days: 7 });
    await message.guild.members.unban(user.id);

    message.channel.send(
      `${emojis.bot.succes} | **${user.user.tag}** başarıyla softbanlandı~! \n> Mesajları silindi ve geri davet yolu hazırlandı >w<`
    );
  } catch (err) {
    message.channel.send(
      `${emojis.bot.error} | **${message.member.displayName}**, işler biraz ters gitti qwq \n> Hata: \`${err.message}\``
    );
  }
};

exports.help = {
  name: "softban",
  aliases: ["yumuşakban", "silban"],
  usage: "softban <@kullanıcı|ID|isim> [sebep]",
  description: "Kullanıcıyı yasaklayıp çıkarır, böylece mesajları silinir.",
  category: "Moderasyon",
  cooldown: 5,
  permissions: ["BAN_MEMBERS"],
};
