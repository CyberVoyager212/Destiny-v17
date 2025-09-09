const emojis = require("../emoji.json");

exports.execute = async (client, message, args) => {
  const subcommand = args[0];

  if (!subcommand) {
    return message.reply(
      `${emojis.bot.error} | **${message.member.displayName}**, bir alt komut seçmelisin~ (ekle, sil, düzenle, göster) :c`
    );
  }

  // EKLEME
  if (subcommand.toLowerCase() === "ekle") {
    const note = args.slice(1).join(" ");
    if (!note) {
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, lütfen kaydetmek istediğin notu gir >///<`
      );
    }
    try {
      await client.db.set(`note_${message.author.id}`, note);
      return message.reply(
        `${emojis.bot.succes} | **${message.member.displayName}**, notun başarıyla kaydedildi! 🎉`
      );
    } catch (error) {
      console.error("Not eklenirken hata:", error);
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, uf! Not eklenirken bir sorun çıktı... tekrar dene~`
      );
    }
  }

  // SİLME
  else if (subcommand.toLowerCase() === "sil") {
    try {
      await client.db.delete(`note_${message.author.id}`);
      return message.reply(
        `${emojis.bot.succes} | **${message.member.displayName}**, notun başarıyla silindi! ✨`
      );
    } catch (error) {
      console.error("Not silinirken hata:", error);
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, not silinirken bir hata oldu... biraz sabret >.<`
      );
    }
  }

  // DÜZENLEME
  else if (subcommand.toLowerCase() === "düzenle") {
    const editAction = args[1];
    if (!editAction) {
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, düzenleme için alt komut seç: ekle, sil, değiştir :c`
      );
    }

    let note = (await client.db.get(`note_${message.author.id}`)) || "";

    if (editAction.toLowerCase() === "ekle") {
      const appendText = args.slice(2).join(" ");
      if (!appendText)
        return message.reply(
          `${emojis.bot.error} | **${message.member.displayName}**, eklemek için metin gir :c`
        );

      note = note ? note + " " + appendText : appendText;
      await client.db.set(`note_${message.author.id}`, note);
      return message.reply(
        `${emojis.bot.succes} | **${message.member.displayName}**, notuna başarıyla eklendi! ✨\nYeni Not: ${note}`
      );
    }

    else if (editAction.toLowerCase() === "sil") {
      const silTip = args[2];
      const target = args.slice(3).join(" ");
      if (!silTip || !target)
        return message.reply(
          `${emojis.bot.error} | **${message.member.displayName}**, silmek için tür (kelime/harf) ve değer gir! >.<`
        );

      if (silTip.toLowerCase() === "kelime") {
        const words = note.split(" ");
        note = words.filter((word) => word !== target).join(" ");
      } else if (silTip.toLowerCase() === "harf") {
        const regex = new RegExp(target, "gi");
        note = note.replace(regex, "");
      } else {
        return message.reply(
          `${emojis.bot.error} | **${message.member.displayName}**, geçerli tür gir: kelime veya harf :c`
        );
      }

      await client.db.set(`note_${message.author.id}`, note);
      return message.reply(
        `${emojis.bot.succes} | **${message.member.displayName}**, notundan başarıyla silindi! ✨\nYeni Not: ${note}`
      );
    }

    else if (editAction.toLowerCase() === "değiştir") {
      const degistirTip = args[2];
      const index = parseInt(args[3]);
      const newValue = args.slice(4).join(" ");
      if (!degistirTip || isNaN(index) || !newValue)
        return message.reply(
          `${emojis.bot.error} | **${message.member.displayName}**, değiştir için tür, index ve yeni değer gir! >.<`
        );

      if (degistirTip.toLowerCase() === "kelime") {
        const words = note.split(" ");
        if (index < 0 || index >= words.length)
          return message.reply(
            `${emojis.bot.error} | **${message.member.displayName}**, geçersiz kelime index'i! :c`
          );
        words[index] = newValue;
        note = words.join(" ");
      } else if (degistirTip.toLowerCase() === "harf") {
        const chars = note.split("");
        if (index < 0 || index >= chars.length)
          return message.reply(
            `${emojis.bot.error} | **${message.member.displayName}**, geçersiz harf index'i! :c`
          );
        chars[index] = newValue;
        note = chars.join("");
      } else {
        return message.reply(
          `${emojis.bot.error} | **${message.member.displayName}**, geçerli tür gir: kelime veya harf :c`
        );
      }

      await client.db.set(`note_${message.author.id}`, note);
      return message.reply(
        `${emojis.bot.succes} | **${message.member.displayName}**, notun başarıyla güncellendi! ✨\nYeni Not: ${note}`
      );
    }

    else {
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, geçersiz düzenleme alt komutu! :c`
      );
    }
  }

  // GÖSTERME
  else if (subcommand.toLowerCase() === "göster") {
    const note = await client.db.get(`note_${message.author.id}`);
    if (!note) {
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, henüz kaydedilmiş notun yok~ >w<`
      );
    }
    return message.reply(
      `${emojis.bot.succes} | **${message.member.displayName}**, işte notun: ✨\n${note}`
    );
  }

  // Geçersiz alt komut
  else {
    return message.reply(
      `${emojis.bot.error} | **${message.member.displayName}**, geçersiz alt komut! (ekle, sil, düzenle, göster) :c`
    );
  }
};

exports.help = {
  name: "not",
  aliases: ["notlar", "kaydet"],
  usage: "not <ekle | sil | düzenle | göster> [not]",
  description:
    "Kullanıcıların notlarını eklemelerine, silmelerine, düzenlemelerine ve görüntülemelerine olanak sağlar. Düzenle komutu 'ekle', 'sil' ve 'değiştir' alt komutlarına ayrılmıştır.",
  category: "Araçlar",
  cooldown: 10,
};
