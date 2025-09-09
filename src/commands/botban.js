const { MessageEmbed } = require("discord.js");
const emojis = require("../emoji.json");

exports.help = {
  name: "botban",
  aliases: ["bb"],
  usage:
    "botban ekle <@user|id|isim> | botban çıkar <@user|id|isim> | botban liste",
  description: "Botbanlı kullanıcıları ekler, çıkarır veya listeler.",
  category: "Moderasyon",
  cooldown: 5,
  admin: true,
};

exports.execute = async (client, message, args) => {
  const db = client.db;
  const admins = client.config.admins || [];
  const authorId = message.author.id;

  if (!admins.includes(authorId)) {
    return message.reply(
      `${emojis.bot.error} | Oof! Sen bu komutu kullanamazsın 😖 Sadece yetkili kişiler işlem yapabilir~`
    );
  }

  const sub = args[0]?.toLowerCase();
  let botbans = (await db.get("botbans")) || [];

  const parseUserId = (arg) => {
    const mentionMatch = arg.match(/^<@!?(\d+)>$/);
    if (mentionMatch) return mentionMatch[1];
    if (/^\d+$/.test(arg)) return arg;
    const member = message.guild.members.cache.find(
      (m) =>
        m.user.username.toLowerCase() === arg.toLowerCase() ||
        m.displayName.toLowerCase() === arg.toLowerCase()
    );
    return member?.user.id;
  };

  // botban ekle
  if (["ekle", "add"].includes(sub)) {
    const targetArg = args[1];
    if (!targetArg)
      return message.reply(
        `${emojis.bot.error} | Huhuhu! Eklemek için bir kullanıcı belirtmelisin 😵`
      );

    const userId = parseUserId(targetArg);
    if (!userId)
      return message.reply(
        `${emojis.bot.error} | Aaah! Geçerli bir kullanıcı bulunamadı 😢`
      );
    if (botbans.includes(userId)) {
      return message.reply(
        `${emojis.bot.error} | Ooops! <@${userId}> zaten botban listesinde 😳`
      );
    }

    botbans.push(userId);
    await db.set("botbans", botbans);
    return message.channel.send(
      `${emojis.bot.succes} | Başarılı! <@${userId}> botban listesine eklendi ✨`
    );
  }

  // botban çıkar
  if (["çıkar", "cikar", "remove"].includes(sub)) {
    const targetArg = args[1];
    if (!targetArg)
      return message.reply(
        `${emojis.bot.error} | Huhuhu! Çıkarmak için bir kullanıcı belirtmelisin 😖`
      );

    const userId = parseUserId(targetArg);
    if (!userId || !botbans.includes(userId)) {
      return message.reply(
        `${emojis.bot.error} | Ooops! Kullanıcı botban listesinde bulunamadı 😢`
      );
    }

    botbans = botbans.filter((id) => id !== userId);
    await db.set("botbans", botbans);
    return message.channel.send(
      `${emojis.bot.succes} | Başarılı! <@${userId}> botban listesinden çıkarıldı ✨`
    );
  }

  // botban liste
  if (["liste", "list"].includes(sub)) {
    if (!botbans.length) {
      return message.channel.send(
        `${emojis.bot.error} | Huhuhu! Botban listesi şu anda boş 😵`
      );
    }

    const embed = new MessageEmbed()
      .setTitle("📋 Botban Listesi")
      .setColor("#FFA500")
      .setDescription(
        botbans.map((id, i) => `**${i + 1}.** <@${id}> (\`${id}\`)`).join("\n")
      );

    return message.channel.send({ embeds: [embed] });
  }

  // Hatalı kullanım
  return message.reply(
    `${emojis.bot.error} | Aaah! Geçersiz kullanım 😖 Doğru kullanım: ${exports.help.usage}`
  );
};
