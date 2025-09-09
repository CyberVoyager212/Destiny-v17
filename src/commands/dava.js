const axios = require("axios");
const { MessageEmbed, MessageActionRow, MessageButton, MessageSelectMenu } = require("discord.js");
const { QuickDB } = require("quick.db");
const db = new QuickDB();

let emojis;
try {
  emojis = require("../emoji.json");
} catch (e) {
  emojis = { bot: { succes: "✅", error: "❌" } };
}

exports.help = {
  name: "dava",
  description: "Dedektiflik oyununu başlatır ve bir davayı çözüme kavuşturmanı ister.",
  usage: "dava başlat",
  category: "Eğlence",
  cooldown: 1
};

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "z-ai/glm-4.5-air:free";

async function callAI(API_KEY, prompt, maxTokens = 2000, temperature = 0.8) {
  try {
    const res = await axios.post(
      OPENROUTER_URL,
      { model: MODEL, messages: [{ role: "user", content: prompt }], max_tokens: maxTokens, temperature },
      { headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` }, timeout: 20000 }
    );
    const data = res.data;
    const content =
      data?.choices?.[0]?.message?.content ||
      data?.choices?.[0]?.text ||
      data?.output?.[0]?.content?.[0]?.text ||
      null;
    return (content || "Yanıt alınamadı.").trim();
  } catch (err) {
    console.error("OpenRouter call error:", err?.response?.data || err?.message || err);
    return null;
  }
}

async function getCaseSummary(API_KEY) {
  const prompt = `Bir şehir merkezinde işlenen davayı detaylıca anlat. Mağdur: zengin iş insanı. Şüpheliler: üç farklı profil. Olay yeri, zaman ve genel tema hakkında üç kısa paragraf yaz. Her paragraf açık, merak uyandırıcı olsun.`;
  return callAI(API_KEY, prompt, 1200, 0.7);
}

async function getSuspectInterrogation(API_KEY, suspect) {
  const prompt = `Şüpheli ${suspect} ile yapılan sorgu tutanağı hazırla. Diyaloğu 3-4 kısa cümle halinde yaz ve her cümleden bir ipucu çıkar. Sonuçta 3 adet net ipucu madde listesi olarak belirt.`;
  return callAI(API_KEY, prompt, 1000, 0.8);
}

async function getCrimeSceneReport(API_KEY) {
  const prompt = `Cinayet mahallindeki kritik unsurları açıkla. En az 5 farklı detay (nesne, leke, iz) listele ve her biri için 1-2 cümle kısa açıklama ekle.`;
  return callAI(API_KEY, prompt, 1000, 0.8);
}

async function getHint(API_KEY, clues) {
  const shortClues = (clues || []).slice(-6).join("\n");
  const prompt = `Verilen ipuçlarına dayanarak oyuncuya 1 kısa, doğrudan fakat çok belli etmeyen ipucu ver. IPUCU tek cümle olsun. Mevcut ipuçları:\n${shortClues}`;
  return callAI(API_KEY, prompt, 300, 0.7);
}

function formatSuccess(text) {
  return `${emojis.bot.succes} | ${text}`;
}

function formatErrorForUser(member, text) {
  return `${emojis.bot.error} | **${member.displayName}**, ${text}`;
}

async function addToLeaderboard(guildId, userId, username, score, outcome) {
  const entry = { userId, username, score, outcome, at: Date.now() };
  await db.push(`leaderboard_${guildId}`, entry);
}

exports.execute = async (client, message, args) => {
  const COOLDOWN = exports.help.cooldown * 1000;
  const userKey = `game_${message.author.id}`;
  const now = Date.now();
  const last = (await db.get(`${userKey}.last`)) || 0;
  if (now - last < COOLDOWN) {
    const remaining = Math.ceil((COOLDOWN - (now - last)) / 1000);
    return message.reply(formatErrorForUser(message.member, `lütfen biraz yavaş ol~ ${remaining} saniye sonra tekrar deneyebilirsin :c`));
  }
  await db.set(`${userKey}.last`, now);

  const isActive = (await db.get(`${userKey}.active`)) || false;
  if (isActive) {
    return message.reply(formatErrorForUser(message.member, "zaten aktif bir oyunun var~ önce onu bitir, sonra yenisini başlatabilirsin!"));
  }

  if (!args[0] || args[0].toLowerCase() !== "başlat") {
    return message.reply(formatErrorForUser(message.member, "dava oyununu başlatmak için `dava başlat` yaz, anladın mı~?"));
  }

  const API_KEY = client.config?.OPENROUTER_API_KEY;
  if (!API_KEY) {
    return message.reply(`${emojis.bot.error} | **HATA:** OpenRouter API anahtarı ayarlı değil. Lütfen sunucu sahibine bildir.`);
  }

  await db.set(`${userKey}.active`, true);
  await db.set(`${userKey}.clues`, []);
  await db.set(`${userKey}.queries`, 0);
  await db.set(`${userKey}.score`, 0);

  const suspects = ["A", "B", "C"];
  const correct = suspects[Math.floor(Math.random() * suspects.length)];
  await db.set(`${userKey}.correct`, correct);

  const summary = await getCaseSummary(API_KEY);
  if (!summary) {
    await db.set(`${userKey}.active`, false);
    return message.reply(`${emojis.bot.error} | **AI servisine bağlanırken problem çıktı.** Lütfen daha sonra tekrar dene.`);
  }

  const embed = new MessageEmbed()
    .setTitle(`${emojis.bot.succes} | Dosya Özeti`)
    .setDescription(summary)
    .setColor("#2F3136")
    .setTimestamp();

  const row1 = new MessageActionRow().addComponents(
    new MessageButton().setCustomId("suspect_A").setLabel("Şüpheli A").setStyle("SECONDARY"),
    new MessageButton().setCustomId("suspect_B").setLabel("Şüpheli B").setStyle("SECONDARY"),
    new MessageButton().setCustomId("suspect_C").setLabel("Şüpheli C").setStyle("SECONDARY"),
    new MessageButton().setCustomId("investigate_scene").setLabel("Olay Yerini İncele").setStyle("SECONDARY")
  );

  const row2 = new MessageActionRow().addComponents(
    new MessageButton().setCustomId("show_clues").setLabel("İpuçlarını Gör").setStyle("PRIMARY"),
    new MessageButton().setCustomId("get_hint").setLabel("İpucu Al (-2 puan)").setStyle("DANGER"),
    new MessageButton().setCustomId("status").setLabel("Durum").setStyle("SECONDARY"),
    new MessageButton().setCustomId("cancel_game").setLabel("İptal Et").setStyle("SECONDARY")
  );

  const row3 = new MessageActionRow().addComponents(
    new MessageSelectMenu()
      .setCustomId("accuse")
      .setPlaceholder("Suçluyu Tahmin Et")
      .addOptions([
        { label: "Şüpheli A", value: "A" },
        { label: "Şüpheli B", value: "B" },
        { label: "Şüpheli C", value: "C" }
      ])
  );

  const sent = await message.channel.send({ embeds: [embed], components: [row1, row2, row3] });

  const filter = (i) => i.user.id === message.author.id;
  const collector = sent.createMessageComponentCollector({ filter, time: 300000 });

  async function disableAllComponents(reasonText) {
    try {
      const disabledRow1 = new MessageActionRow().addComponents(
        new MessageButton().setCustomId("suspect_A").setLabel("Şüpheli A").setStyle("SECONDARY").setDisabled(true),
        new MessageButton().setCustomId("suspect_B").setLabel("Şüpheli B").setStyle("SECONDARY").setDisabled(true),
        new MessageButton().setCustomId("suspect_C").setLabel("Şüpheli C").setStyle("SECONDARY").setDisabled(true),
        new MessageButton().setCustomId("investigate_scene").setLabel("Olay Yerini İncele").setStyle("SECONDARY").setDisabled(true)
      );
      const disabledRow2 = new MessageActionRow().addComponents(
        new MessageButton().setCustomId("show_clues").setLabel("İpuçlarını Gör").setStyle("PRIMARY").setDisabled(true),
        new MessageButton().setCustomId("get_hint").setLabel("İpucu Al (-2 puan)").setStyle("DANGER").setDisabled(true),
        new MessageButton().setCustomId("status").setLabel("Durum").setStyle("SECONDARY").setDisabled(true),
        new MessageButton().setCustomId("cancel_game").setLabel("İptal Et").setStyle("SECONDARY").setDisabled(true)
      );
      const disabledRow3 = new MessageActionRow().addComponents(
        new MessageSelectMenu().setCustomId("accuse").setPlaceholder("Suçluyu Tahmin Et").addOptions([
          { label: "Şüpheli A", value: "A" },
          { label: "Şüpheli B", value: "B" },
          { label: "Şüpheli C", value: "C" }
        ]).setDisabled(true)
      );
      await sent.edit({ components: [disabledRow1, disabledRow2, disabledRow3] });
      if (reasonText) {
        try {
          await message.channel.send(reasonText);
        } catch (e) {}
      }
    } catch (e) {
      console.error("disableAllComponents error:", e);
    }
  }

  collector.on("collect", async (interaction) => {
    try {
      if (interaction.isSelectMenu() && interaction.customId === "accuse") {
        await interaction.deferReply({ ephemeral: true });
        const choice = interaction.values[0];
        const correctSuspect = await db.get(`${userKey}.correct`);
        let scoreChange = 0;
        let resultEmbed;
        if (choice === correctSuspect) {
          scoreChange = 10;
          resultEmbed = new MessageEmbed()
            .setTitle(`${emojis.bot.succes} | Doğru Tahmin!`)
            .setDescription(`Tebrikler! Şüpheli ${choice} suçlu çıktı. Başarın için +10 puan kazandın.`)
            .setColor("GREEN");
          await db.add(`${userKey}.score`, scoreChange);
          const finalScore = (await db.get(`${userKey}.score`)) || 0;
          await addToLeaderboard(message.guild.id, message.author.id, message.member.displayName, finalScore, "win");
        } else {
          scoreChange = -5;
          resultEmbed = new MessageEmbed()
            .setTitle(`${emojis.bot.error} | Yanlış Tahmin!`)
            .setDescription(`Maalesef, gerçek suçlu Şüpheli ${correctSuspect} idi. -5 puan.`)
            .setColor("RED");
          await db.add(`${userKey}.score`, scoreChange);
          const finalScore = (await db.get(`${userKey}.score`)) || 0;
          await addToLeaderboard(message.guild.id, message.author.id, message.member.displayName, finalScore, "lose");
        }

        try {
          await interaction.editReply({ embeds: [resultEmbed] });
        } catch (e) {}

        await db.set(`${userKey}.active`, false);
        await disableAllComponents(`${emojis.bot.succes} | Oyun sonlandı — tahmin yapıldı. Tekrar oynamak istersen \`dava başlat\` yaz, hadi bakalım~`);
        collector.stop("accused");
        return;
      }

      await interaction.deferReply({ ephemeral: true });

      if (interaction.customId && interaction.customId.startsWith("suspect_")) {
        let count = (await db.get(`${userKey}.queries`)) || 0;
        if (count >= 3) {
          return interaction.editReply(formatErrorForUser(message.member, "bu şüpheli için sorgu hakkın doldu, üzgünüm~ başka ipuçlarına bakabilirsin."));
        }
        await db.add(`${userKey}.queries`, 1);
        const suspect = interaction.customId.split("_")[1];
        const result = await getSuspectInterrogation(API_KEY, suspect);
        if (!result) return interaction.editReply(`${emojis.bot.error} | **AI'den ipucu alınamadı.** Lütfen daha sonra dene.`);
        await db.push(`${userKey}.clues`, `Şüpheli ${suspect}: ${result}`);
        const embed2 = new MessageEmbed()
          .setTitle(`${emojis.bot.succes} | ${suspect} İfadesi`)
          .setDescription(result)
          .setColor("#FFA500");
        return interaction.editReply({ embeds: [embed2] });
      }

      if (interaction.customId === "investigate_scene") {
        const report = await getCrimeSceneReport(API_KEY);
        if (!report) return interaction.editReply(`${emojis.bot.error} | **Olay yeri raporu alınamadı.** AI servisini kontrol et.`);
        await db.push(`${userKey}.clues`, `Olay Yeri: ${report}`);
        const embed3 = new MessageEmbed()
          .setTitle(`${emojis.bot.succes} | Olay Yeri İncelemesi`)
          .setDescription(report)
          .setColor("#00BFFF");
        return interaction.editReply({ embeds: [embed3] });
      }

      if (interaction.customId === "show_clues") {
        const clues = (await db.get(`${userKey}.clues`)) || [];
        if (!clues.length) return interaction.editReply(formatErrorForUser(message.member, "henüz hiç ipucun yok, önce 'Olay Yerini İncele' veya bir şüpheliyi sorgula~"));
        const embedC = new MessageEmbed()
          .setTitle(`${emojis.bot.succes} | Toplanan İpuçları`)
          .setDescription(clues.map((c, i) => `**${i + 1}.** ${c}`).join("\n\n"))
          .setColor("#9ACD32");
        return interaction.editReply({ embeds: [embedC] });
      }

      if (interaction.customId === "status") {
        const queries = (await db.get(`${userKey}.queries`)) || 0;
        const score = (await db.get(`${userKey}.score`)) || 0;
        const remaining = Math.max(0, 3 - queries);
        const embedS = new MessageEmbed()
          .setTitle(`${emojis.bot.succes} | Oyun Durumu`)
          .setDescription(`Puanın: **${score}**\nKalan sorgu hakkı: **${remaining}**\nZaman: ${new Date().toLocaleString()}`)
          .setColor("#FFD700");
        return interaction.editReply({ embeds: [embedS] });
      }

      if (interaction.customId === "cancel_game") {
        await db.delete(userKey);
        await db.set(`${userKey}.active`, false);
        try {
          await disableAllComponents(`${emojis.bot.succes} | Oyun iptal edildi. Tekrar oynamak istersen 'dava başlat' yaz, hadi tekrar dene~`);
        } catch (e) {}
        return interaction.editReply(`${emojis.bot.succes} | Oyun iptal edildi~`);
      }

      if (interaction.customId === "get_hint") {
        let score = (await db.get(`${userKey}.score`)) || 0;
        if (score < 2) {
          await db.add(`${userKey}.score`, 0);
          return interaction.editReply(formatErrorForUser(message.member, "yeterli puanın yok, ipucu almak için en az 2 puan gerekli~"));
        }
        await db.sub(`${userKey}.score`, 2);
        const clues = (await db.get(`${userKey}.clues`)) || [];
        const hint = await getHint(API_KEY, clues);
        if (!hint) return interaction.editReply(`${emojis.bot.error} | **IPUCU alınamadı.** AI servisinde bir sorun var.`);
        await db.push(`${userKey}.clues`, `Ücretli İpucu: ${hint}`);
        const embedH = new MessageEmbed()
          .setTitle(`${emojis.bot.succes} | Küçük İpucu`)
          .setDescription(hint)
          .setFooter({ text: "İpucu için 2 puan kesildi." });
        return interaction.editReply({ embeds: [embedH] });
      }

      return interaction.editReply(`${emojis.bot.error} | Bilinmeyen işlem.`);
    } catch (err) {
      console.error(err);
      try {
        await interaction.editReply(`${emojis.bot.error} | **Bir şeyler ters gitti~** AI servisi veya bot tarafında beklenmedik bir hata oluştu.`);
      } catch (e) {}
    }
  });

  collector.on("end", async () => {
    try {
      await db.set(`${userKey}.active`, false);
      await disableAllComponents();
    } catch (e) {}
  });
};
