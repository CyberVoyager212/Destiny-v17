const { MessageEmbed, Collection } = require("discord.js");
const emojis = require("../emoji.json");

const CONFIG = {
  LOG_CHANNEL_ID: null,
  BASE_SIMILARITY: 0.82,
  RETRY_SIMILARITY: 0.75,
  MIN_CHARS_NO_FLAG: 10,
  LEARNING_RATE: 0.15,
  SENSITIVITY: "normal"
};

module.exports.help = {
  name: "memory",
  aliases: ["hafıza", "ezber"],
  description: "Verilen kelimeleri ezberleyip tekrar yazmanız gereken bir oyun oynayın.",
  usage: "memory [1-20]",
  category: "Eğlence",
  cooldown: 20
};

module.exports.execute = async (bot, message, args) => {
  if (!args[0]) return message.channel.send(`${emojis.bot.error} | **${message.member.displayName}**, bir seviye seçmen gerek... 1 ile 20 arasında olur lütfen >w<`);
  let level = parseInt(args[0]);
  if (isNaN(level) || level < 1 || level > 20) return message.channel.send(`${emojis.bot.error} | **${message.member.displayName}**, sadece 1 ile 20 arasında bir seviye seçebilirsin~ hile yapmaya çalışma :3`);

  if (!bot.games) bot.games = new Collection();
  if (!bot.userTypingStats) bot.userTypingStats = new Map();

  const current = bot.games.get(message.channel.id);
  if (current) return message.channel.send(`${emojis.bot.error} | **${message.member.displayName}**, burada zaten \`${current.name}\` oyunu oynanıyor~ biraz sabret tatlım :c`);

  bot.games.set(message.channel.id, { name: "memory", author: message.author.id });

  try {
    const memorize = genArray(level);
    const memorizeDisplay = memorize.map((w) => `\`${w.toUpperCase()}\``).join(" ");

    const intro = new MessageEmbed()
      .setTitle("🧠 Hafıza Oyunu")
      .setDescription(`⏱ | **${message.member.displayName}**, 10 saniyen var~ bu kelimeleri ezberle!\n${memorizeDisplay}\n\n⚠️ Not: Hızlı yapıştırmalar otomatik olarak algılanır; eğer gerçekten hızlı yazdıysan ikinci deneme hakkı veriyorum — emeğin boşa gitmesin!`)
      .setColor("BLUE");

    const memorizemessage = await message.channel.send({ embeds: [intro] });
    await delay(10000);

    const prompt = new MessageEmbed()
      .setTitle("⌛ Süre Doldu!")
      .setDescription(`**${message.member.displayName}**, şimdi sıra sende! Görür görmez öyle bir tane atma; emeğinle yazdıysan sorun yok~ cevap yazınca değerlendirilecektir.`)
      .setColor("RED");

    await memorizemessage.edit({ embeds: [prompt] });

    const memorizeType = normalizeText(memorize.join(" "));
    const filter = (res) => res.author.id === message.author.id;
    const startTime = Date.now();
    const collected = await message.channel.awaitMessages({ filter, max: 1, time: 30000 });

    bot.games.delete(message.channel.id);

    if (!collected.size) {
      return message.channel.send(`${emojis.bot.error} | **${message.member.displayName}**, süre doldu qwq\nDoğru cevap şuydu: ${memorizeDisplay}`);
    }

    const firstMsg = collected.first();
    const answerRaw = firstMsg.content;
    const answer = normalizeText(answerRaw);
    const endTime = Date.now();
    const timeTaken = (endTime - startTime) / 1000;
    const chars = answer.length;
    const cps = chars / Math.max(timeTaken, 0.001);
    const similarity = similarityRatio(memorizeType, answer);

    if (!isAcceptable(similarity, CONFIG.BASE_SIMILARITY)) {
      return message.channel.send(`${emojis.bot.error} | **${message.member.displayName}**, yanlış yazdın :c\nDoğru cevap: ${memorizeDisplay}`);
    }

    const userAvg = bot.userTypingStats.get(message.author.id) || null;
    const suspicious = isSuspiciousPaste(chars, timeTaken, cps, memorize.length, userAvg);

    if (suspicious) {
      const warn = await message.channel.send(`${emojis.bot.error} | **${message.member.displayName}**, hmm... bu cevap biraz çok hızlı geldi bana 👀\nLütfen emeğinle yazdığını göstermek için **15 saniye** içinde tekrar yaz. Eğer gerçekten yazdıysan ikinci denemede seni onaylayacağım~`);
      const retryStart = Date.now();
      const second = await message.channel.awaitMessages({ filter, max: 1, time: 15000 });

      if (!second.size) {
        await logSuspicious(message, firstMsg, { reason: "no-retry" });
        return message.channel.send(`${emojis.bot.error} | **${message.member.displayName}**, tekrar yazma süresi doldu... bu tur iptal edildi :c`);
      }

      const secondMsg = second.first();
      const answer2 = normalizeText(secondMsg.content);
      const retryEnd = Date.now();
      const retryTime = (retryEnd - retryStart) / 1000;
      const chars2 = answer2.length;
      const cps2 = chars2 / Math.max(retryTime, 0.001);
      const similarity2 = similarityRatio(memorizeType, answer2);

      if (!isAcceptable(similarity2, CONFIG.RETRY_SIMILARITY)) {
        await logSuspicious(message, secondMsg, { reason: "retry-wrong" });
        return message.channel.send(`${emojis.bot.error} | **${message.member.displayName}**, ikinci denemede de doğru yazamadın :c\nDoğru cevap: ${memorizeDisplay}`);
      }

      const suspicious2 = isSuspiciousPaste(chars2, retryTime, cps2, memorize.length, userAvg, true);
      if (suspicious2) {
        await logSuspicious(message, secondMsg, { reason: "retry-suspicious" });
        return message.channel.send(`${emojis.bot.error} | **${message.member.displayName}**, maalesef ikinci deneme de şüpheli bulundu~ Bu tur kopyala-yapıştır olarak kaydedildi :c`);
      }

      updateUserTypingStat(bot, message.author.id, cps2);
      return message.channel.send(`${emojis.bot.succes} | **${message.member.displayName}**, teşekkürler! İkinci denemede başarıyla doğruladın, tebrikler! 🎉`);
    }

    updateUserTypingStat(bot, message.author.id, cps);
    return message.channel.send(`${emojis.bot.succes} | **${message.member.displayName}**, woooow! Doğru bildin~ tebrikler!! 🎉🎉`);
  } catch (err) {
    bot.games.delete(message.channel.id);
    console.error(err);
    return message.channel.send(`${emojis.bot.error} | Bir hata oldu... sanırım beyin hücrelerim birbirine girdi qwq`);
  }
};

function normalizeText(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function levenshtein(a, b) {
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
    }
  }
  return matrix[b.length][a.length];
}

function similarityRatio(a, b) {
  const dist = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length, 1);
  return 1 - dist / maxLen;
}

function isAcceptable(similarity, base) {
  return similarity >= base;
}

function isSuspiciousPaste(chars, timeTaken, cps, numWords, userAvg = null, isRetry = false) {
  if (chars <= CONFIG.MIN_CHARS_NO_FLAG) return false;
  let cpsThreshold;
  if (chars <= 10) cpsThreshold = 20;
  else if (chars <= 20) cpsThreshold = 12;
  else if (chars <= 40) cpsThreshold = 8;
  else if (chars <= 80) cpsThreshold = 5;
  else cpsThreshold = 3;
  if (isRetry) cpsThreshold *= 1.5;
  if (userAvg) {
    const adaptive = Math.max(cpsThreshold, userAvg * 3);
    cpsThreshold = adaptive;
  }
  const minTimeThreshold = Math.max(0.25 * (numWords || 1), 0.5);
  if (timeTaken < minTimeThreshold) return true;
  if (cps > cpsThreshold) return true;
  return false;
}

function updateUserTypingStat(bot, userId, cps) {
  if (!bot.userTypingStats) bot.userTypingStats = new Map();
  const prev = bot.userTypingStats.get(userId) || cps;
  const updated = prev * (1 - CONFIG.LEARNING_RATE) + cps * CONFIG.LEARNING_RATE;
  bot.userTypingStats.set(userId, updated);
}

async function logSuspicious(message, offendingMsg, meta = {}) {
  if (!CONFIG.LOG_CHANNEL_ID) return;
  try {
    const ch = await message.guild.channels.fetch(CONFIG.LOG_CHANNEL_ID);
    if (!ch) return;
    const embed = new MessageEmbed()
      .setTitle("⚠️ Şüpheli Memory Denemesi")
      .addField("Kullanıcı", `${message.author.tag} (${message.author.id})`)
      .addField("Kanal", `${message.channel.name} (${message.channel.id})`)
      .addField("Mesaj", offendingMsg.content || "—")
      .addField("Meta", JSON.stringify(meta))
      .setTimestamp();
    ch.send({ embeds: [embed] });
  } catch (err) {
    console.error("Log kanalı gönderilemedi:", err);
  }
}

function genArray(level) {
  const colors = ["kırmızı", "mavi", "yeşil", "sarı", "turuncu", "mor", "pembe"];
  const directions = ["sağ", "sol", "yukarı", "aşağı", "ileri", "geri"];
  const fruits = ["elma", "armut", "muz", "çilek", "karpuz", "üzüm"];
  const sourceArr = [colors, directions, fruits][Math.floor(Math.random() * 3)];
  const arr = [];
  for (let i = 0; i < level; i++) arr.push(sourceArr[Math.floor(Math.random() * sourceArr.length)]);
  return arr;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
