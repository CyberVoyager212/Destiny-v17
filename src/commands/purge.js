const { MessageEmbed } = require("discord.js");
const emojis = require("../emoji.json");

exports.help = {
  name: "purge",
  aliases: ["temizle"],
  usage: "purge <@kullanıcı|kelime> ; [#kanal|all]",
  description:
    "Belirtilen kullanıcının veya kelime içeren mesajları belirtilen kanal(lar)da veya tüm sunucuda toplu siler.",
  category: "Moderasyon",
  cooldown: 5,
  permissions: ["MANAGE_MESSAGES"],
};

exports.execute = async (client, message, args) => {
  if (!message.member.permissions.has("MANAGE_MESSAGES")) {
    return message.reply(
      `${emojis.bot.error} | **${message.member.displayName}**, üzgünüm ama bunu yapmak için \`Mesajları Yönet\` yetkisine sahip olmalısın~ :c`
    );
  }

  if (!args.length) {
    return message.reply(
      `${emojis.bot.error} | **${message.member.displayName}**, lütfen silinecek kullanıcıyı veya kelimeyi gir! Örnek: \`purge @user ; #kanal\` veya \`purge kelime ; all\``
    );
  }

  try {
    // --- 1) İlk olarak kullanıcı komut mesajını silmeyi dene ---
    // (Bu, komut sahibinin mesajının purge işlemine karışmaması için)
    try {
      await message.delete().catch(() => {});
    } catch (errDelMsg) {
      // Silme yetkisi yoksa atla; işlem devam edecek
    }

    // --- 2) Komutla ilişkili olabilecek bot mesajlarını (kısa aralık içinde) güvenli şekilde temizle ---
    // Burada yalnızca mevcut kanaldaki son 50 mesajdan botun bazı olası cevaplarını kaldırmaya çalışıyoruz.
    try {
      const recent = await message.channel.messages.fetch({ limit: 50 });
      const botRelated = recent.filter((m) => {
        if (m.author?.id !== client.user.id) return false;
        // Eğer mesaj referans ile komuta işaret ediyorsa (örn. bot reply), sil
        if (m.reference && m.reference.messageId === message.id) return true;
        // Eğer bot mesajı içerik olarak komutun arama terimini içeriyorsa da sil (güvenli eşleme)
        const joinedArgs = args.join(" ").toLowerCase();
        if (joinedArgs && m.content && m.content.toLowerCase().includes(joinedArgs)) return true;
        // Genel: eğer bot mesajı çok kısa zamanda gönderildiyse (ör. 30s içinde) potansiyel komut cevabı say -> sil
        if (Date.now() - m.createdTimestamp < 30_000) return true;
        return false;
      });

      // Silmeye çalış (botun MANAGE_MESSAGES yetkisi varsa çalışır, yoksa hata atmaz)
      for (const [, bm] of botRelated) {
        try {
          await bm.delete().catch(() => {});
        } catch {}
      }
    } catch (errBotClean) {
      // Eğer fetch/deletion başarısızsa devam et; purge yine çalışacak
    }

    // --- 3) Purge işlemine devam et ---
    const fullArgs = args.join(" ").split(";");
    const searchTerm = (fullArgs[0] || "").trim();
    const targetPart = (fullArgs[1] || "").trim().toLowerCase();

    if (!searchTerm) {
      return message.channel.send(
        `${emojis.bot.error} | **${message.member.displayName}**, arama terimi boş olamaz~ :c`
      );
    }

    const user =
      message.mentions.users.first() ||
      client.users.cache.get(searchTerm) ||
      message.guild.members.cache.find(
        (m) => m.user.username.toLowerCase() === searchTerm.toLowerCase()
      )?.user;

    let targetChannels;
    if (targetPart === "all") {
      targetChannels = message.guild.channels.cache.filter(
        (ch) => ch.type === "GUILD_TEXT"
      );
    } else if (message.mentions.channels.size > 0) {
      targetChannels = message.mentions.channels;
    } else {
      targetChannels = new Map([[message.channel.id, message.channel]]);
    }

    let totalDeleted = 0;
    const errorChannels = [];

    // Döngü: her hedef kanalda son 100 mesajı çek, uygunları seç, sil
    for (const channel of Array.from(targetChannels.values())) {
      try {
        const fetched = await channel.messages.fetch({ limit: 100 });
        let toDelete;
        if (user) {
          // Kullanıcı bazlı silme
          toDelete = fetched.filter((m) => m.author.id === user.id);
        } else {
          // Metin bazlı silme (içerik varsa kontrol et)
          const term = searchTerm.toLowerCase();
          toDelete = fetched.filter((m) =>
            m.content ? m.content.toLowerCase().includes(term) : false
          );
        }

        // Botun kendi mesajlarını yanlışlıkla silmemek için filtrele (istemiyorsan bu satırı kaldırabilirsin)
        toDelete = toDelete.filter((m) => m.author.id !== client.user.id);

        if (toDelete.size > 0) {
          // bulkDelete Collection veya sayı alır; Collection veriyoruz
          const deleted = await channel.bulkDelete(toDelete, true);
          totalDeleted += (deleted && deleted.size) || 0;
        }
      } catch (err) {
        console.error(`[Purge] ${channel.name || channel.id} hata:`, err);
        errorChannels.push(channel.name || channel.id);
      }
    }

    if (totalDeleted === 0) {
      return message.channel.send(
        `${emojis.bot.error} | **${message.member.displayName}**, silinecek uygun mesaj bulunamadı~ belki çok eski veya zaten temizlenmişler :c`
      );
    }

    const successMsg = await message.channel.send(
      `${emojis.bot.succes} | **${message.member.displayName}**, başarıyla toplam **${totalDeleted}** mesaj temizlendi! ✨`
    );
    setTimeout(() => successMsg.delete().catch(() => {}), 5000);

    if (errorChannels.length) {
      message.channel.send(
        `${emojis.bot.error} | Bazı kanallarda silme sırasında hata oluştu: ${errorChannels
          .map((n) => `\`${n}\``)
          .join(", ")}. Bunları manuel kontrol et lütfen~`
      );
    }
  } catch (err) {
    console.error("Purge komutu genel hata:", err);
    return message.reply(
      `${emojis.bot.error} | **${message.member.displayName}**, uf! Bir sorun çıktı ve işlem tamamlanamadı... lütfen sonra tekrar dene~ :c`
    );
  }
};
