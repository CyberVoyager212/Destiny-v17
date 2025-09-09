const { MessageCollector } = require("discord.js");
const emojis = require("../emoji.json");

exports.help = {
  name: "sil",
  aliases: ["temizle", "purge"],
  usage: "sil <miktar>",
  description: "Belirtilen sayıda mesajı siler. 14 günden eski mesajlar için onay alınır.",
  category: "Moderasyon",
  cooldown: 5,
  permissions: ["MANAGE_MESSAGES"],
};

exports.execute = async (client, message, args) => {
  if (!message.member.permissions.has("MANAGE_MESSAGES")) {
    return message.reply(`${emojis.bot.error} | **${message.member.displayName}**, mesajları yönetme iznin yok~ :c`);
  }

  let amount = parseInt(args[0]);
  if (!amount || amount < 1) {
    return message.reply(`${emojis.bot.error} | Lütfen geçerli bir sayı giriniz~`);
  }

  try {
    // Komut mesajını hemen sil
    await message.delete().catch(() => {});

    let totalDeleted = 0;
    const now = Date.now();
    const twoWeeks = 14 * 24 * 60 * 60 * 1000;

    // Bulk delete işlemi 100'er limitli
    while (amount > 0) {
      const fetchAmount = amount > 100 ? 100 : amount;
      const fetched = await message.channel.messages.fetch({ limit: fetchAmount });

      const bulkDeletable = fetched.filter(msg => now - msg.createdTimestamp < twoWeeks);
      const oldMessages = fetched.filter(msg => now - msg.createdTimestamp >= twoWeeks);

      // Toplu sil
      try {
        const deleted = await message.channel.bulkDelete(bulkDeletable, true);
        totalDeleted += deleted.size;
      } catch {}

      // Eğer eski mesaj yoksa devam et
      if (oldMessages.size > 0) {
        // Onay iste
        const infoMsg = await message.channel.send(
          `${emojis.bot.error} | **${message.member.displayName}**, ${oldMessages.size} mesaj 14 günden eski olduğu için topluca silinemiyor~\nTek tek silmek için "onaylıyorum", iptal için "onaylamıyorum" yazın.`
        );

        const filter = m =>
          m.author.id === message.author.id &&
          ["onaylıyorum", "onaylamıyorum"].includes(m.content.toLowerCase());

        const collector = new MessageCollector(message.channel, { filter, time: 30000, max: 1 });

        const collected = await new Promise(resolve => {
          collector.on("end", collected => resolve(collected));
        });

        const response = collected.first();
        if (!response) {
          await infoMsg.edit(`${emojis.bot.error} | Zaman doldu, işlem iptal edildi~ :c`).catch(() => {});
          setTimeout(() => infoMsg.delete().catch(() => {}), 2000);
          return;
        }

        await response.delete().catch(() => {});
        if (response.content.toLowerCase() === "onaylıyorum") {
          let deletedCount = 0;
          for (const msg of oldMessages.values()) {
            try {
              await msg.delete();
              deletedCount++;
            } catch {}
          }
          await infoMsg.edit(`${emojis.bot.succes} | ${deletedCount} eski mesaj tek tek silindi~ ✨`);
          setTimeout(() => infoMsg.delete().catch(() => {}), 4000);
        } else {
          await infoMsg.edit(`${emojis.bot.error} | İşlem iptal edildi~ :c`);
          setTimeout(() => infoMsg.delete().catch(() => {}), 2000);
          return;
        }
      }

      amount -= fetchAmount;
    }

    // Toplam silinen mesaj sayısını bildir
    const finalMsg = await message.channel.send(`${emojis.bot.succes} | Toplam ${totalDeleted} mesaj silindi~ ✨`);
    setTimeout(() => finalMsg.delete().catch(() => {}), 4000);

  } catch (err) {
    console.error(err);
    message.channel.send(`${emojis.bot.error} | **${message.member.displayName}**, bir hata oluştu~ tekrar deneyin :c`);
  }
};
