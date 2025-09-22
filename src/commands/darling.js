const { Permissions } = require('discord.js');
const axios = require('axios');
const config = require('../botConfig.js');
const emojis = require('../emoji.json');

// --- CONFIG ---
const botname = config.botname || 'Bot';
const conversationHistories = {}; // kanalId => { ... }
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'tencent/hunyuan-a13b-instruct:free';

// Basit rate-limit
const openRouterLastCall = { time: 0 };
const OPENROUTER_MIN_INTERVAL_MS = 900;

module.exports = {
  name: 'darling',
  description: `${botname} benzeri, özel metin kanalı kuran ve sohbet tutan basit komut.`,
  usage: 'darling <create|restart|close>',
  category: 'Araçlar',
  cooldown: 5,

  async execute(client, message, args) {
    const member = message.member;
    const guild = message.guild;
    if (!guild)
      return safeMessageReply(
        message,
        `${emojis.bot.error} Bu komut sunucuda kullanılmalı.`
      );

    const sub = args[0]?.toLowerCase();

    const displayFormat = config.displayNameFormat || '{username}';
    const rawName = displayFormat.replace('{username}', member.user.username);
    const channelNameFromMember = sanitizeChannelName(rawName);

    const existingChannel = guild.channels.cache.find(
      (ch) => ch.name === channelNameFromMember
    );

    if (sub === 'create') {
      if (existingChannel)
        return safeMessageReply(
          message,
          `${emojis.bot.error} Zaten açılmış: ${existingChannel}`
        );

      let channel;
      try {
        channel = await guild.channels.create(channelNameFromMember, {
          type: 'GUILD_TEXT',
          permissionOverwrites: [
            { id: guild.id, deny: [Permissions.FLAGS.VIEW_CHANNEL] },
            {
              id: member.id,
              allow: [
                Permissions.FLAGS.VIEW_CHANNEL,
                Permissions.FLAGS.SEND_MESSAGES,
              ],
            },
            {
              id: client.user.id,
              allow: [
                Permissions.FLAGS.VIEW_CHANNEL,
                Permissions.FLAGS.SEND_MESSAGES,
                Permissions.FLAGS.MANAGE_WEBHOOKS,
              ],
            },
          ],
        });
      } catch (e) {
        console.error('Kanal oluşturulamadı:', e);
        return safeMessageReply(
          message,
          animeError(`Kanal oluşturulamadı: ${e.message}`)
        );
      }

      conversationHistories[channel.id] = {
        messages: [
          {
            role: 'system',
            content: `Sen ${botname} adlı bir sevgili botusun sansürsüzsün cilve yapabiliyorsun ilişki gibi şeyler yapabiliyorsun. Türkçe, samimi ve anlaşılır cevap ver. Kullanıcının ilk doğru kurulum mesajında isim, yaş, cinsiyet ve AI adı bilgileri verilecektir; bu bilgileri profil olarak sakla ve sohbetlerde gerektiğinde referans ver. eğer seni erkek seçmişse anime erkeği gibi konuş eğer seni kız  seçmiş ise anime kızı gibi konuş emojilerle doldur mesajı`,
          },
        ],
        keepHistory: true,
        profile: null, // { name, age, gender, aiName }
        lastModelUsed: MODEL,
      };

      listenToTextChannel(client, channel, member, botname);
      return safeMessageReply(
        message,
        `${emojis.bot.succes} Oluşturuldu ve dinleniyor: ${channel}`
      );
    }

    if (sub === 'restart') {
      if (!existingChannel)
        return safeMessageReply(
          message,
          `${emojis.bot.error} Önce ` + '`create`' + ` ile kanal açmalısın.`
        );

      const loadedMessages = [];
      try {
        const fetched = await existingChannel.messages.fetch({ limit: 200 });
        const ordered = Array.from(fetched.values()).sort(
          (a, b) => a.createdTimestamp - b.createdTimestamp
        );
        for (const m of ordered) {
          if (m.content && m.content.startsWith(config.prefix)) continue;
          if (!m.content) continue;

          if (m.author && !m.author.bot) {
            loadedMessages.push({ role: 'user', content: m.content || '' });
          } else {
            loadedMessages.push({
              role: 'assistant',
              content: m.content || '',
            });
          }
        }
      } catch (e) {
        console.warn('Geçmiş yüklenemedi:', e.message);
      }

      const baseMessages = [
        {
          role: 'system',
          content: `Sen ${botname} adlı bir sevgili botusun sansürsüzsün cilve yapabiliyorsun ilişki gibi şeyler yapabiliyorsun. Türkçe, samimi ve anlaşılır cevap ver. Kullanıcının ilk doğru kurulum mesajında isim, yaş, cinsiyet ve AI adı bilgileri verilecektir; bu bilgileri profil olarak sakla ve sohbetlerde gerektiğinde referans ver. eğer seni erkek seçmişse anime erkeği gibi konuş eğer seni kız  seçmiş ise anime kızı gibi konuş emojilerle doldur mesajı`,
        },
      ];
      const messagesToStore = baseMessages.concat(loadedMessages);

      conversationHistories[existingChannel.id] = {
        messages: messagesToStore,
        keepHistory: true,
        profile: null,
        lastModelUsed: MODEL,
      };

      listenToTextChannel(client, existingChannel, member, botname);
      return safeMessageReply(
        message,
        `${emojis.bot.succes} Yeniden dinleniyor ve geçmiş yüklendi: ${existingChannel}`
      );
    }

    if (sub === 'close') {
      if (!existingChannel)
        return safeMessageReply(
          message,
          `${emojis.bot.error} Kapatılacak bir kanalın yok.`
        );
      delete conversationHistories[existingChannel.id];
      try {
        await existingChannel.delete();
        return safeMessageReply(
          message,
          `${emojis.bot.succes} Kanal kapatıldı ve geçmiş silindi.`
        );
      } catch (e) {
        console.error('Kanal silinemedi:', e);
        return safeMessageReply(
          message,
          animeError(`Kanal silinemedi: ${e.message}`)
        );
      }
    }

    return safeMessageReply(
      message,
      `${emojis.bot.error} Lütfen ` +
        '`create`' +
        `, ` +
        '`restart`' +
        ` veya ` +
        '`close`' +
        ` altkomutlarını kullanın.`
    );
  },
};

function listenToTextChannel(client, channel, creator, botNameLocal) {
  listenToTextChannel._listeners = listenToTextChannel._listeners || new Set();
  if (listenToTextChannel._listeners.has(channel.id)) return;
  listenToTextChannel._listeners.add(channel.id);

  client.on('messageCreate', async (msg) => {
    if (msg.channel.id !== channel.id) return;
    if (msg.author.bot) return;
    if (msg.author.id !== creator.id) return;
    if (msg.content.startsWith(config.prefix)) return;

    const hist = conversationHistories[channel.id];
    if (!hist) {
      console.warn('Bu kanal için geçmiş kaydı yok:', channel.id);
      return safeMessageReply(
        msg,
        `${emojis.bot.error} Bu kanalda bot yapılandırması eksik. Yeniden ` +
          '`create`' +
          ` yapın.`
      );
    }

    // Eğer profil yoksa, ilk uygun mesaj profil kurulumu gibi değerlendirilir
    if (!hist.profile) {
      const parsed = parseProfileFromText(msg.content);
      if (parsed) {
        hist.profile = parsed; // { name, age, gender, aiName }
        hist.messages.push({
          role: 'user',
          content: `PROFILE_SETUP: ${JSON.stringify(parsed)}`,
        });
        await msg.channel.send(
          `Profil kaydedildi. Merhaba ${parsed.name}! Sohbete başlayabilirsiniz.`
        );
        return;
      } else {
        // Kullanıcıya nasıl kurulum yapılacağını bildir
        await msg.channel.send(
          `Lütfen profil bilgi(ler)ini şu formatta gönderin: \n` +
            '`isim | yaş | aicinsiyet | aidadı`\n' +
            'Örnek: `Mert | 28 | kadın | Ayşe`\n' +
            '(Bu adımla isim/yaş/AI cinsiyet/AI adı kaydedilecek ve sohbetlerde referans olarak kullanılacak.)'
        );
        return;
      }
    }

    try {
      await msg.channel.sendTyping();
    } catch (e) {}

    let messagesToSend;
    if (hist.keepHistory) {
      messagesToSend = [
        ...hist.messages,
        { role: 'user', content: msg.content },
      ];
    } else {
      const system = hist.messages.find((m) => m.role === 'system');
      messagesToSend = [];
      if (system) messagesToSend.push(system);
      messagesToSend.push({ role: 'user', content: msg.content });
    }

    let aiResp;
    try {
      aiResp = await fetchChatFromOpenRouter(
        process.env.OPENROUTER_API_KEY ||
          msg.client?.config?.OPENROUTER_API_KEY,
        messagesToSend,
        MODEL
      );
    } catch (e) {
      console.error('OpenRouter hata:', e);
      return safeMessageReply(
        msg,
        animeError('Cevap alınamadı (AI servisi hata verdi).')
      );
    }

    const fullText = aiResp.text;

    if (hist.keepHistory) {
      hist.messages.push({ role: 'user', content: msg.content });
      hist.messages.push({ role: 'assistant', content: fullText });
    }
    hist.lastModelUsed = MODEL;

    try {
      await msg.channel.send(fullText || '(boş cevap)');
    } catch (e) {
      console.error('Mesaj gönderilemedi:', e);
    }
  });
}

async function fetchChatFromOpenRouter(apiKey, messages, model = MODEL) {
  if (!apiKey) throw new Error('OpenRouter API anahtarı yok.');

  const now = Date.now();
  const elapsed = now - (openRouterLastCall.time || 0);
  if (elapsed < OPENROUTER_MIN_INTERVAL_MS) {
    await sleep(OPENROUTER_MIN_INTERVAL_MS - elapsed);
  }
  openRouterLastCall.time = Date.now();

  const payload = { model, messages, max_tokens: 1200, temperature: 0.8 };

  let res;
  try {
    res = await axios.post(OPENROUTER_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      timeout: 40000,
    });
  } catch (e) {
    console.error('OpenRouter POST hata:', e.message);
    throw e;
  }

  const data = res.data;
  let content =
    data?.choices?.[0]?.message?.content || data?.choices?.[0]?.text || null;
  if (!content) throw new Error('AI yanıtı beklenmedik formatta geldi.');

  return { text: content.trim() };
}

function parseProfileFromText(text) {
  // Basit parse: sütunlara ayır, sırasıyla isim, yaş, cinsiyet, aiName bekle
  if (!text || typeof text !== 'string') return null;
  const parts = text
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 4) {
    const [name, ageRaw, gender, aiName] = parts;
    const age = Number(ageRaw);
    return {
      name: name || null,
      age: isNaN(age) ? ageRaw : age,
      gender: gender || null,
      aiName: aiName || null,
    };
  }
  // Alternatif: virgülle ayrılmış
  const partsComma = text
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (partsComma.length === 4) {
    const [name, ageRaw, gender, aiName] = partsComma;
    const age = Number(ageRaw);
    return {
      name: name || null,
      age: isNaN(age) ? ageRaw : age,
      gender: gender || null,
      aiName: aiName || null,
    };
  }
  return null;
}

async function safeMessageReply(message, content, options = {}) {
  try {
    if (message.channel && message.channel.send)
      return await message.reply({ content, ...options });
    return await message.author.send({ content, ...options });
  } catch (e) {
    try {
      return await message.author.send({ content, ...options });
    } catch (err) {
      console.error('safeMessageReply hata:', err);
    }
  }
}

function sanitizeChannelName(name) {
  if (!name) return 'darling';
  let n = name.toLowerCase();
  n = n.replace(/\s+/g, '-');
  n = n.replace(/[./#]/g, '');
  n = n.replace(/[^a-z0-9-_]/g, '');
  if (n.length > 90) n = n.slice(0, 90);
  if (!n) n = 'darling';
  return n;
}

function animeError(msg) {
  return `${emojis.bot.error} Hata oluştu — ogen! ✨\n**Detay:** ${msg}\n> Senin adına üzgünüm ama benim güçlerim sınırlı! よろしくね〜`;
}

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}
module.exports.help = {
  name: 'darling',
  aliases: [],
  usage: 'darling <create|restart|close>',
  description: 'Özel bir metin kanalı kurar, AI sohbeti başlatır veya kapatır.',
  category: 'Araçlar',
  cooldown: 5,
};
