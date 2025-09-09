const emojis = (() => {
  try { return require("../emoji.json"); } catch (e) { return { bot: { succes: "✅", error: "❌" } }; }
})();

exports.execute = async (client, message, args) => {
  if (!client.config?.admins || !client.config.admins.includes(message.author.id)) {
    return message.reply(`${emojis.bot.error} | **${message.member.displayName}**, yetkin yok gibi görünüyor~ üzgünüm :c`);
  }

  if (!args || args.length === 0) {
    return message.reply(`${emojis.bot.error} | ⚠️ Kullanım örnekleri:\n• status toggle <playing|streaming|listening|watching> <mesaj>\n• status loop create <type text ; type text ; ...>\n• status loop stop\n• status loop reset`);
  }

  const ACT = ["playing", "streaming", "listening", "watching"];
  const STAT = ["online", "idle", "dnd", "invisible"];

  const sub = args[0].toLowerCase();

  const ensureStopAll = () => {
    if (typeof client.stopCustomStatusLoop === "function") try { client.stopCustomStatusLoop(); } catch {}
    if (typeof client.stopStatusLoop === "function") try { client.stopStatusLoop(); } catch {}
    if (client.customStatusLoop) try { clearInterval(client.customStatusLoop); client.customStatusLoop = null; } catch {}
    if (client.statusLoop) try { clearInterval(client.statusLoop); client.statusLoop = null; } catch {}
  };

  if (sub === "toggle") {
    if (args.length < 3) {
      return message.reply(`${emojis.bot.error} | **${message.member.displayName}**, toggle için type ve mesaj gerekli~ örn: status toggle playing geliştiriliyor`);
    }
    const type = args[1].toLowerCase();
    const text = args.slice(2).join(" ");
    if (!ACT.includes(type)) {
      return message.reply(`${emojis.bot.error} | **${message.member.displayName}**, toggle sadece playing/streaming/listening/watching destekliyor~`);
    }
    try {
      ensureStopAll();
      await client.user.setActivity(text, { type: type.toUpperCase(), url: type === "streaming" ? "https://twitch.tv/" : undefined });
      return message.reply(`${emojis.bot.succes} | Aktivite ayarlandı: **${type.toUpperCase()}** — ${text}\nDöngü durduruldu, istediğin zaman \`status loop create ...\` ile kendi döngünü başlatabilirsin~`);
    } catch (err) {
      return message.reply(`${emojis.bot.error} | **${message.member.displayName}**, bir şeyler ters gitti qwq\nHata: \`${(err && err.message) || err}\``);
    }
  }

  if (sub === "loop") {
    const action = args[1]?.toLowerCase();
    if (!action) return message.reply(`${emojis.bot.error} | **${message.member.displayName}**, loop create/stop/reset kullanmalısın~`);
    if (action === "stop") {
      if (typeof client.stopCustomStatusLoop === "function") client.stopCustomStatusLoop();
      if (client.customStatusLoop) { clearInterval(client.customStatusLoop); client.customStatusLoop = null; }
      return message.reply(`${emojis.bot.succes} | Durum döngüsü durduruldu — hazır moduna döndün~`);
    }
    if (action === "reset") {
      if (typeof client.stopCustomStatusLoop === "function") client.stopCustomStatusLoop();
      if (client.customStatusLoop) { clearInterval(client.customStatusLoop); client.customStatusLoop = null; }
      if (typeof client.startStatusLoop === "function") {
        client.startStatusLoop(client.defaultStatuses || []);
        return message.reply(`${emojis.bot.succes} | Varsayılan durum döngüsüne geri döndüm~ keyifli olsun!`);
      } else {
        return message.reply(`${emojis.bot.error} | Reset desteklenmiyor gibi :(`);
      }
    }
    if (action === "create") {
      const raw = args.slice(2).join(" ");
      if (!raw) return message.reply(`${emojis.bot.error} | **${message.member.displayName}**, döngü oluşturmak için en az bir giriş yazmalısın~ örn: playing geliştiriliyor ; playing ${client.user.username} en iyi bot`);
      const parts = raw.split(";").map(p => p.trim()).filter(Boolean);
      const list = [];
      for (const p of parts) {
        const toks = p.split(/\s+/);
        const t = toks.shift()?.toLowerCase();
        const txt = toks.join(" ").trim();
        if (!t) continue;
        if (ACT.includes(t)) {
          if (!txt) return message.reply(`${emojis.bot.error} | Her activity için bir mesaj gerekli: "${p}" eksik görünüyor~`);
          list.push({ kind: "activity", type: t.toUpperCase(), name: txt });
        } else if (STAT.includes(t)) {
          list.push({ kind: "status", status: t });
        } else {
          return message.reply(`${emojis.bot.error} | Bilinmeyen tür: ${t} — sadece playing/streaming/listening/watching/online/idle/dnd/invisible kullanılabilir~`);
        }
      }
      if (list.length === 0) return message.reply(`${emojis.bot.error} | **${message.member.displayName}**, geçerli bir döngü öğesi bulamadım :c`);
      try {
        if (typeof client.stopStatusLoop === "function") client.stopStatusLoop();
        if (client.statusLoop) { clearInterval(client.statusLoop); client.statusLoop = null; }
        if (typeof client.startCustomStatusLoop === "function") {
          client.startCustomStatusLoop(list, 5000);
        } else {
          if (client.customStatusLoop) { clearInterval(client.customStatusLoop); client.customStatusLoop = null; }
          let idx = 0;
          const apply = async () => {
            const cur = list[idx];
            try {
              if (cur.kind === "activity") await client.user.setActivity(cur.name, { type: cur.type, url: cur.type === "STREAMING" ? "https://twitch.tv/" : undefined });
              else await client.user.setStatus(cur.status);
            } catch {}
            idx = (idx + 1) % list.length;
          };
          apply();
          client.customStatusLoop = setInterval(apply, 5000);
        }
        return message.reply(`${emojis.bot.succes} | Döngü oluşturuldu ve başlatıldı~ her 5 saniyede bir diğer duruma geçilecek!`);
      } catch (err) {
        return message.reply(`${emojis.bot.error} | **${message.member.displayName}**, döngü başlatılamadı qwq\nHata: \`${(err && err.message) || err}\``);
      }
    }
    return message.reply(`${emojis.bot.error} | **${message.member.displayName}**, bilinmeyen loop komutu :c (create/stop/reset bekleniyor)`);
  }

  if (args.length < 2) {
    return message.reply(`${emojis.bot.error} | Kullanım: playing|streaming|listening|watching|online|idle|dnd|invisible <mesaj>`);
  }

  const type = sub.toLowerCase();
  const text = args.slice(1).join(" ");

  try {
    if (client.customStatusLoop) { clearInterval(client.customStatusLoop); client.customStatusLoop = null; }
    if (typeof client.stopCustomStatusLoop === "function") client.stopCustomStatusLoop();
    if (typeof client.stopStatusLoop === "function") client.stopStatusLoop();
    if (ACT.includes(type)) {
      await client.user.setActivity(text, { type: type.toUpperCase(), url: type === "streaming" ? "https://twitch.tv/" : undefined });
      return message.reply(`${emojis.bot.succes} | Aktivite ayarlandı: **${type.toUpperCase()}** — ${text}\nDöngü durduruldu, istersen \`status loop create ...\` ile tekrar başlatabilirsin~`);
    }
    if (STAT.includes(type)) {
      await client.user.setStatus(type);
      return message.reply(`${emojis.bot.succes} | Durum başarıyla **${type}** olarak değiştirildi~ huzur dolu günler~`);
    }
    return message.reply(`${emojis.bot.error} | Geçersiz tür: ${type} — playing/streaming/listening/watching/online/idle/dnd/invisible kullanılabilir~`);
  } catch (err) {
    return message.reply(`${emojis.bot.error} | **${message.member.displayName}**, işler karıştı qwq\nHata: \`${(err && err.message) || err}\``);
  }
};

exports.help = {
  name: "status",
  aliases: ["setstatus", "durum"],
  usage: "status toggle <playing|streaming|listening|watching> <mesaj>\nstatus loop create <type text ; type text ; ...>\nstatus loop stop\nstatus loop reset\nstatus <playing|streaming|listening|watching|online|idle|dnd|invisible> <mesaj>",
  description: "Botun durumunu değiştirir, özel döngüler oluşturur/durdurur/resetler.",
  category: "Bot",
  cooldown: 5,
  admin: true
};
