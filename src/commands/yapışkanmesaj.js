const emojis = require("../emoji.json"); // emoji.json içe aktarılır

exports.help = {
  name: "yapiskanmesaj",
  aliases: ["sticky", "sabit","yapışkanmesaj"],
  usage: "yapiskanmesaj <ekle|sil|list> [#kanal] [mesaj]",
  description: "Belirtilen kanala yapışkan mesaj ekler, siler veya listeler.",
  category: "Araçlar",
  cooldown: 5,
  permissions: ["ADMINISTRATOR"],
};

exports.execute = async (client, message, args) => {
  if (!message.member.permissions.has("ADMINISTRATOR")) {
    return message.reply(
      `${emojis.bot.error} | **${message.member.displayName}**, bu komutu kullanmak için \`Yönetici\` yetkisine sahip olmalısın qwq~`
    );
  }

  const sub = args[0]?.toLowerCase();
  const db = client.db;

  if (sub === "ekle") {
    const channel = message.mentions.channels.first();
    if (!channel) {
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, lütfen mesajın gönderileceği kanalı etiketle~`
      );
    }
    const content = args.slice(2).join(" ");
    if (!content) {
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, yapışkan mesaj içeriğini yazmayı unuttun qwq~`
      );
    }
    try {
      const sent = await channel.send(content);
      await db.set(`stickyMessage_${channel.id}`, {
        messageId: sent.id,
        content,
      });
      return message.reply(
        `${emojis.bot.succes} | **${message.member.displayName}**, yapışkan mesaj başarıyla ${channel} kanalına ayarlandı~ ✨`
      );
    } catch (err) {
      console.error("Yapışkan mesaj gönderilirken hata:", err);
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, yapışkan mesaj ayarlanırken bir hata oluştu qwq~`
      );
    }
  } else if (sub === "sil") {
    const channel = message.mentions.channels.first();
    if (!channel) {
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, lütfen silinecek yapışkan mesajın bulunduğu kanalı etiketle~`
      );
    }
    const key = `stickyMessage_${channel.id}`;
    const data = await db.get(key);
    if (!data) {
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, bu kanalda ayarlanmış bir yapışkan mesaj yok qwq~`
      );
    }
    await db.delete(key);
    return message.reply(
      `${emojis.bot.succes} | **${message.member.displayName}**, ${channel} kanalındaki yapışkan mesaj başarıyla kaldırıldı~ ✨`
    );
  } else if (sub === "list") {
    const all = await db.all();
    const sticky = all.filter((e) => e.id.startsWith("stickyMessage_"));
    if (!sticky.length) {
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, ayarlanmış yapışkan mesaj bulunamadı qwq~`
      );
    }

    let txt = `📌 **Ayarlanmış Yapışkan Mesajlar:**\n`;
    for (const entry of sticky) {
      const channelId = entry.id.split("_")[1];
      txt += `<#${channelId}>: ${entry.value.content}\n`;
    }
    return message.reply(`${emojis.bot.succes} | ${txt}`);
  } else {
    return message.reply(
      `${emojis.bot.error} | **${message.member.displayName}**, geçersiz alt komut! \`ekle\`, \`sil\` veya \`list\` kullanın qwq~`
    );
  }
};
