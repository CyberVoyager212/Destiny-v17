const { MessageEmbed } = require('discord.js');
const ms = require('ms');
const botConfig = require('../botConfig.js');
const axios = require('axios');
const emojis = require('../emoji.json');

const delay = (ms) => new Promise((r) => setTimeout(r, ms));
function levenshtein(a, b) {
  const dp = Array(b.length + 1)
    .fill(null)
    .map((_, i) => [i]);
  dp[0] = Array(a.length + 1)
    .fill(0)
    .map((_, j) => j);
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      dp[i][j] =
        b[i - 1] === a[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j - 1], dp[i][j - 1], dp[i - 1][j]);
    }
  }
  return dp[b.length][a.length];
}

function splitDiscordMessage(text, maxLen = 1900) {
  const parts = [];
  let buffer = '';
  let inCode = false;
  const lines = String(text ?? '').split('\n');
  for (const line of lines) {
    const toggles = (line.match(/```/g) || []).length;
    const next = buffer.length ? buffer + '\n' + line : line;
    if (next.length > maxLen) {
      if (buffer) {
        if (inCode) buffer += '\n```';
        parts.push(buffer);
        buffer = inCode ? '```' + line : line;
      } else {
        parts.push(next.slice(0, maxLen));
        buffer = next.slice(maxLen);
      }
    } else {
      buffer = next;
    }
    if (toggles % 2 === 1) inCode = !inCode;
  }
  if (buffer) {
    if (inCode) buffer += '\n```';
    parts.push(buffer);
  }
  return parts;
}

async function sendWithTyping(channel, content, { replyTo } = {}) {
  await channel.sendTyping().catch(() => {});
  const typingTimer = setInterval(
    () => channel.sendTyping().catch(() => {}),
    8000
  );
  try {
    const chunks = splitDiscordMessage(content);
    if (replyTo) {
      await replyTo.reply(chunks[0]);
    } else {
      await channel.send(chunks[0]);
    }
    for (let i = 1; i < chunks.length; i++) {
      await delay(400);
      await channel.send(chunks[i]);
    }
  } finally {
    clearInterval(typingTimer);
  }
}

const recentMessages = new Map();
const lastMessage = new Map();

function isUrl(text) {
  const urlRegex = /https?:\/\/[^\s]+|www\.[^\s]+/i;
  return urlRegex.test(text);
}
function isInvite(text) {
  const inviteRegex =
    /(discord\.gg|discordapp\.com\/invite|discord.com\/invite)\/[A-Za-z0-9]+/i;
  return inviteRegex.test(text);
}
function countEmojis(text) {
  const custom = (text.match(/<a?:\w+:\d+>/g) || []).length;
  const unicode = (text.match(/\p{Extended_Pictographic}/gu) || []).length;
  return custom + unicode;
}
function capsPercent(text) {
  const letters = text.replace(/[^A-Za-z]/g, '');
  if (!letters.length) return 0;
  const uppers = letters.replace(/[^A-Z]/g, '').length;
  return Math.round((uppers / letters.length) * 100);
}

const DEFAULT_AUTOMOD = {
  enabled: true,
  muteRoleId: null,
  features: {
    profanity: { enabled: true, words: ['s*ç', 'oç', 'amk'], action: 'delete' },
    antispam: {
      enabled: true,
      messages: 5,
      interval: 7,
      action: 'mute',
      muteMinutes: 10,
    },
    antiinvite: { enabled: true, action: 'delete' },
    antilink: { enabled: false, action: 'delete' },
    massmention: { enabled: true, threshold: 5, action: 'delete' },
    anticaps: {
      enabled: true,
      thresholdPercent: 70,
      minLength: 8,
      action: 'delete',
    },
    repeated: { enabled: true, repeats: 3, action: 'delete' },
    antiattachment: { enabled: false, action: 'delete' },
    emojiSpam: { enabled: false, threshold: 10, action: 'delete' },
    minAccountAge: { enabled: false, days: 3, action: 'kick' },
  },
  ignoreRoles: [],
  ignoreChannels: [],
};

async function applyAction(action, message, reason, cfg) {
  try {
    if (action === 'delete') {
      if (message.deletable) await message.delete().catch(() => {});
      try {
        await message.channel
          .send(
            `${emojis.bot.succes} | Mesaj başarıyla kaldırıldı. (${reason})`
          )
          .catch(() => {});
      } catch {}
    } else if (action === 'warn') {
      try {
        await message.author
          .send(
            `${emojis.bot.error} | ✨ Uyarı: ${reason} — Lütfen kurallara dikkat et, sempai~`
          )
          .catch(() => {});
      } catch {}
    } else if (action === 'mute') {
      const roleId = cfg.muteRoleId;
      if (!roleId) {
        if (message.deletable) await message.delete().catch(() => {});
        try {
          await message.channel
            .send(
              `${emojis.bot.error} | ⚠️ Mute rolü ayarlı değil — mesaj silindi (${reason}).`
            )
            .catch(() => {});
        } catch {}
        return;
      }
      const member = message.member;
      if (member && !member.roles.cache.has(roleId)) {
        await member.roles.add(roleId).catch(() => {});
        const muteMinutes =
          (cfg.features &&
            cfg.features.antispam &&
            cfg.features.antispam.muteMinutes) ||
          10;
        setTimeout(async () => {
          try {
            if (member && member.roles.cache.has(roleId))
              await member.roles.remove(roleId).catch(() => {});
          } catch {}
        }, muteMinutes * 60 * 1000);
      }
      if (message.deletable) await message.delete().catch(() => {});
      try {
        await message.channel
          .send(
            `${emojis.bot.succes} | Kullanıcı geçici olarak susturuldu (${reason}).`
          )
          .catch(() => {});
      } catch {}
    } else if (action === 'kick') {
      if (message.deletable) await message.delete().catch(() => {});
      if (message.member && message.member.kickable)
        await message.member.kick(reason).catch(() => {});
      try {
        await message.channel
          .send(
            `${emojis.bot.succes} | Kullanıcı sunucudan atıldı (${reason}).`
          )
          .catch(() => {});
      } catch {}
    } else if (action === 'ban') {
      if (message.deletable) await message.delete().catch(() => {});
      if (message.member && message.member.bannable)
        await message.member.ban({ reason }).catch(() => {});
      try {
        await message.channel
          .send(`${emojis.bot.succes} | Kullanıcı banlandı (${reason}).`)
          .catch(() => {});
      } catch {}
    }
  } catch (err) {
    console.error('applyAction error:', err);
    try {
      await message.channel
        .send(
          `${emojis.bot.error} | ✨ Oopsie~ Bir şey ters gitti while applying action: ${err.message}`
        )
        .catch(() => {});
    } catch {}
  }
}

module.exports = async (client, message) => {
  if (message.author.bot || !message.guild) return;

  const db = client.db;
  const guildId = message.guild.id;
  const userId = message.author.id;
  const channelId = message.channel.id;
  const content = (message.content || '').trim();
  const ownerId = client.config && client.config.ownerId;
  const admins = (client.config && client.config.admins) || [];

  const logEntry = {
    userID: message.author.id,
    timestamp: Date.now(),
  };

  const guildKey = `messageLogs_${message.guild.id}`;

  let messageLogs = (await client.db.get(guildKey)) || [];
  messageLogs.push(logEntry);
  if (messageLogs.length > 1000) {
    messageLogs = messageLogs.slice(messageLogs.length - 1000);
  }
  await client.db.set(guildKey, messageLogs);

  const prefix =
    (await db.get(`prefix_${guildId}`)) ||
    (client.config && client.config.prefix) ||
    '!';

  const acceptKey = `acceptedRules_${guildId}_${userId}`;
  const pendingKey = `${acceptKey}_pending`;

  const lower = (content || '').toLowerCase();
  const isTrigger =
    lower.startsWith(prefix) ||
    lower.startsWith((global.botName || '').toLowerCase()) ||
    false;

  const isAccepted = true;
  if (!isAccepted) {
    return;
  }

  try {
    if (!admins.includes(userId) && userId !== ownerId) {
      let cfg = await db.get(`otomod_${guildId}`);
      if (!cfg) {
        cfg = DEFAULT_AUTOMOD;
        await db.set(`otomod_${guildId}`, cfg);
      }
      if (cfg && cfg.enabled) {
        if (cfg.ignoreChannels && cfg.ignoreChannels.includes(channelId)) {
        } else if (
          message.member &&
          cfg.ignoreRoles &&
          message.member.roles.cache.some((r) => cfg.ignoreRoles.includes(r.id))
        ) {
        } else {
          const txt = content || '';

          const pConf = cfg.features.profanity || {};
          if (pConf.enabled && pConf.words && txt) {
            const found = pConf.words.find((w) => {
              if (!w) return false;
              try {
                return txt.toLowerCase().includes(w.toLowerCase());
              } catch {
                return false;
              }
            });
            if (found) {
              await applyAction(
                pConf.action,
                message,
                `Küfür tespit: ${found}`,
                cfg
              );
              return;
            }
          }

          const invConf = cfg.features.antiinvite || {};
          if (invConf.enabled && txt && isInvite(txt)) {
            await applyAction(
              invConf.action,
              message,
              'Invite link tespit edildi',
              cfg
            );
            return;
          }

          const linkConf = cfg.features.antilink || {};
          if (linkConf.enabled && txt && isUrl(txt)) {
            await applyAction(
              linkConf.action,
              message,
              'Link tespit edildi',
              cfg
            );
            return;
          }

          const attConf = cfg.features.antiattachment || {};
          if (
            attConf.enabled &&
            message.attachments &&
            message.attachments.size > 0
          ) {
            await applyAction(
              attConf.action,
              message,
              'Attachment/ek tespit edildi',
              cfg
            );
            return;
          }

          const mmConf = cfg.features.massmention || {};
          if (mmConf.enabled) {
            const mentionCount =
              message.mentions.users.size + message.mentions.roles.size;
            if (mentionCount >= (mmConf.threshold || 5)) {
              await applyAction(
                mmConf.action,
                message,
                `Çoklu mention: ${mentionCount}`,
                cfg
              );
              return;
            }
          }

          const ac = cfg.features.anticaps || {};
          if (ac.enabled && txt && txt.length >= (ac.minLength || 8)) {
            const pct = capsPercent(txt);
            if (pct >= (ac.thresholdPercent || 70)) {
              await applyAction(
                ac.action,
                message,
                `Büyük harf spamı (%${pct})`,
                cfg
              );
              return;
            }
          }

          const es = cfg.features.emojiSpam || {};
          if (es.enabled && txt) {
            const ecount = countEmojis(txt);
            if (ecount >= (es.threshold || 10)) {
              await applyAction(
                es.action,
                message,
                `Emoji spam: ${ecount}`,
                cfg
              );
              return;
            }
          }

          const rep = cfg.features.repeated || {};
          if (rep.enabled && txt) {
            const key = `${guildId}-${userId}`;
            const last = lastMessage.get(key);
            if (last && last.content === txt) {
              last.count = (last.count || 1) + 1;
              last.ids = last.ids || [];
              last.ids.push(message.id);
            } else {
              lastMessage.set(key, {
                content: txt,
                count: 1,
                ts: Date.now(),
                ids: [message.id],
              });
            }
            const nowLast = lastMessage.get(key);
            if (nowLast.count >= (rep.repeats || 3)) {
              const need = rep.repeats || 3;
              const fetched = await message.channel.messages.fetch({
                limit: 100,
              });
              const matched = fetched.filter(
                (m) =>
                  m.author.id === userId &&
                  (m.content || '').trim() === txt.trim()
              );
              const matchedArray = Array.from(matched.values())
                .sort((a, b) => b.createdTimestamp - a.createdTimestamp)
                .slice(0, need);

              if (matchedArray.length) {
                const fourteenDays = 14 * 24 * 60 * 60 * 1000;
                const bulk = matchedArray.filter(
                  (m) => Date.now() - m.createdTimestamp < fourteenDays
                );
                const old = matchedArray.filter(
                  (m) => Date.now() - m.createdTimestamp >= fourteenDays
                );

                if (bulk.length > 1) {
                  try {
                    await message.channel.bulkDelete(
                      bulk.map((m) => m.id),
                      true
                    );
                  } catch (err) {
                    for (const m of bulk) {
                      try {
                        const fetchedMsg = await message.channel.messages
                          .fetch(m.id)
                          .catch(() => null);
                        if (fetchedMsg)
                          await fetchedMsg.delete().catch(() => {});
                      } catch {}
                    }
                  }
                } else {
                  for (const m of bulk) {
                    try {
                      const fetchedMsg = await message.channel.messages
                        .fetch(m.id)
                        .catch(() => null);
                      if (fetchedMsg) await fetchedMsg.delete().catch(() => {});
                    } catch {}
                  }
                }

                for (const m of old) {
                  try {
                    const fetchedMsg = await message.channel.messages
                      .fetch(m.id)
                      .catch(() => null);
                    if (fetchedMsg) await fetchedMsg.delete().catch(() => {});
                  } catch {}
                }

                try {
                  await message.channel
                    .send(
                      `${emojis.bot.succes} | <@${userId}> aynı mesajı ${matchedArray.length} kere tekrar etti; tekrar eden mesajlar temizlendi.`
                    )
                    .catch(() => {});
                } catch {}
              }

              lastMessage.set(key, { content: null, count: 0, ids: [] });
              return;
            }
          }

          const spam = cfg.features.antispam || {};
          if (spam.enabled) {
            const key = `${guildId}-${userId}`;
            const arr = recentMessages.get(key) || [];
            arr.push({ ts: Date.now(), id: message.id });
            const intervalMs = (spam.interval || 7) * 1000;
            const windowStart = Date.now() - intervalMs;
            const cleaned = arr.filter((t) => t.ts > windowStart);
            recentMessages.set(key, cleaned);
            if (cleaned.length >= (spam.messages || 5)) {
              const fetched = await message.channel.messages.fetch({
                limit: 100,
              });
              const toDeleteCollection = fetched.filter(
                (m) =>
                  m.author.id === userId && m.createdTimestamp > windowStart
              );
              const toDelete = Array.from(toDeleteCollection.values());
              if (toDelete.length) {
                const fourteenDays = 14 * 24 * 60 * 60 * 1000;
                const bulk = toDelete.filter(
                  (m) => Date.now() - m.createdTimestamp < fourteenDays
                );
                const old = toDelete.filter(
                  (m) => Date.now() - m.createdTimestamp >= fourteenDays
                );

                if (bulk.length) {
                  try {
                    await message.channel.bulkDelete(
                      bulk.map((m) => m.id),
                      true
                    );
                  } catch (err) {
                    for (const m of bulk) {
                      try {
                        const fetchedMsg = await message.channel.messages
                          .fetch(m.id)
                          .catch(() => null);
                        if (fetchedMsg)
                          await fetchedMsg.delete().catch(() => {});
                      } catch {}
                    }
                  }
                }

                for (const m of old) {
                  try {
                    const fetchedMsg = await message.channel.messages
                      .fetch(m.id)
                      .catch(() => null);
                    if (fetchedMsg) await fetchedMsg.delete().catch(() => {});
                  } catch {}
                }
              }

              try {
                await message.channel
                  .send(
                    `${emojis.bot.succes} | <@${userId}> spam tespit edildi. Son mesajları temizledim, lütfen kurallara uyun.`
                  )
                  .catch(() => {});
              } catch {}

              recentMessages.set(key, []);
              return;
            }
          }

          const mAge = cfg.features.minAccountAge || {};
          if (mAge.enabled) {
            const createdAt = message.author.createdTimestamp;
            const days = (Date.now() - createdAt) / (1000 * 60 * 60 * 24);
            if (days < (mAge.days || 3)) {
              await applyAction(
                mAge.action,
                message,
                `Hesap yaşı ${Math.floor(days)} gün < required`,
                cfg
              );
              return;
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('otomod hata:', err);
    try {
      await message.channel
        .send(
          `${
            emojis.bot.error
          } | ✨ Hata yakalandı — otomod çalışırken beklenmedik bir hata oluştu.\nDetay: ${
            err.message || 'Bilinmeyen hata'
          }\nLütfen logları kontrol et veya geliştiriciye bildir, sempai~`
        )
        .catch(() => {});
    } catch {}
  }

  const bomChannelId = await db.get(`bom_${guildId}`);
  const kelimeChannelId = await db.get(`kelime_${guildId}`);

  if (bomChannelId && message.channel.id === bomChannelId) {
    let lastNumber = (await db.get(`bom_lastNumber_${bomChannelId}`)) || 0;
    let lastUser = await db.get(`bom_lastUser_${bomChannelId}`);
    if (message.author.id === lastUser) {
      return message.delete().catch(() => {});
    }
    const contentLower = message.content.trim().toLowerCase();
    const expectedNumber = lastNumber + 1;
    let isCorrect = false;
    let playedValue = null;
    if (expectedNumber % 5 === 0) {
      if (contentLower === 'bom') {
        isCorrect = true;
        playedValue = expectedNumber;
      }
    } else {
      const current = parseInt(contentLower);
      if (!isNaN(current) && current === expectedNumber) {
        isCorrect = true;
        playedValue = current;
      }
    }
    if (!isCorrect) {
      return message.delete().catch(() => {});
    }
    await message.react('✅').catch(() => {});
    await db.set(`bom_lastNumber_${bomChannelId}`, playedValue);
    await db.set(`bom_lastUser_${bomChannelId}`, message.author.id);
    return;
  }

  if (kelimeChannelId && message.channel.id === kelimeChannelId) {
    const lastWord = await db.get(`kelime_lastWord_${kelimeChannelId}`);
    const lastUser = await db.get(`kelime_lastUser_${kelimeChannelId}`);
    if (message.author.id === lastUser) {
      return message.delete().catch(() => {});
    }
    const newWord = message.content.toLowerCase().trim();
    let isValidWord = false;
    try {
      const res = await fetch(
        `https://sozluk.gov.tr/gts?ara=${encodeURIComponent(newWord)}`
      );
      const j = await res.json();
      isValidWord = Array.isArray(j) && j.length > 0 && j[0].madde;
    } catch {
      isValidWord = false;
    }
    if (!isValidWord) {
      return message.delete().catch(() => {});
    }
    if (lastWord) {
      const lastChar = lastWord.slice(-1);
      if (newWord[0] !== lastChar) {
        return message.delete().catch(() => {});
      }
    }
    await message.react('✅').catch(() => {});
    await db.set(`kelime_lastWord_${kelimeChannelId}`, newWord);
    await db.set(`kelime_lastUser_${kelimeChannelId}`, message.author.id);
    return;
  }

  if (!content.startsWith(prefix)) {
    for (const user of message.mentions.users.values()) {
      if (await db.get(`etiketYasak_${guildId}_${user.id}`)) {
        await message.delete().catch(() => {});
        const warnKey = `warn_${guildId}_${userId}`;
        const bwKey = `bw_${guildId}_${userId}`;
        let warnCount = (await db.get(warnKey)) || 0;
        let bwCount = (await db.get(bwKey)) || 0;
        if (bwCount >= 5) {
          await message.guild.members
            .ban(userId, { reason: '5 büyük uyarı' })
            .catch(() => {});
          await db.delete(bwKey);
          return message.channel
            .send(`${emojis.bot.error} | 🚫 5 büyük uyarı → banlandın!`)
            .catch(() => {});
        }
        warnCount++;
        await db.set(warnKey, warnCount);
        if (warnCount >= 3) {
          const member = message.guild.members.cache.get(userId);
          if (member?.manageable) {
            try {
              await member.timeout(ms('10m'), '3 küçük uyarı doldu');
            } catch {}
          }
          await db.delete(warnKey);
          await db.add(bwKey, 1);
          return message.channel
            .send(
              `${emojis.bot.error} | 🚫 3 küçük uyarı → 10dk timeout + 1 büyük uyarı!`
            )
            .catch(() => {});
        } else {
          return message.channel
            .send(
              `${emojis.bot.error} | 🚫 Yasaklı etiket! Küçük uyarı: ${warnCount}/3`
            )
            .catch(() => {});
        }
      }
    }

    const allFilters = (await db.get(`mesajEngel_${guildId}`)) || {};
    const filters = allFilters[channelId] || [];

    if (Array.isArray(filters) && filters.length) {
      const isNumber = (txt) => /^\d+$/.test(txt);
      const isWord = (txt) => /^[\p{L}]+$/u.test(txt);
      const isURL = (txt) =>
        /(?:(?:https?|ftp):\/\/|www\.|[a-z0-9-]+\.[a-z]{2,})([^\s]*)/i.test(
          txt
        );

      const allowOnly = filters
        .filter((f) => f.startsWith('!'))
        .map((f) => f.slice(1));
      if (allowOnly.length) {
        const ok = allowOnly.some((f) =>
          f === '#sayı#'
            ? isNumber(content)
            : f === '#kelime#'
            ? isWord(content)
            : f === '#url#'
            ? isURL(content)
            : content === f
        );
        if (!ok) {
          await message.delete().catch(() => {});
          return;
        }
      } else {
        for (const f of filters) {
          if (
            (f === '#sayı#' && isNumber(content)) ||
            (f === '#kelime#' && isWord(content)) ||
            (f === '#url#' && isURL(content)) ||
            content === f
          ) {
            await message.delete().catch(() => {});
            return;
          }
        }
      }
    }
  }

  const otoCevaplar = (await db.get(`otoCevap_${guildId}`)) || [];
  if (!content.startsWith(prefix)) {
    for (const cev of otoCevaplar) {
      const msgLower = content.toLowerCase();
      const triggerLower = (cev.trigger || '').toLowerCase();
      const isMatch =
        cev.exact === 1
          ? msgLower === triggerLower
          : msgLower.includes(triggerLower);
      if (!isMatch) continue;
      const opts = cev.options || {};
      try {
        if (opts.typing) await message.channel.sendTyping().catch(() => {});
        if (opts.delete) await message.delete().catch(() => {});
        if (opts.dm) {
          try {
            if (cev.embed === 1) {
              const embed = new MessageEmbed()
                .setTitle(cev.title || 'Oto-Cevap')
                .setDescription(cev.response)
                .setColor('BLUE');
              await message.author.send({ embeds: [embed] }).catch(() => {});
            } else {
              await message.author
                .send(
                  cev.response +
                    (opts.mention ? ` <@${message.author.id}>` : '')
                )
                .catch(() => {});
            }
          } catch (err) {
            console.error('DM gönderilemedi:', err);
          }
          continue;
        }
        if (opts.webhook) {
          let webhook = (await message.channel.fetchWebhooks()).find(
            (wh) => wh.name === 'OtoCevap'
          );
          if (!webhook) {
            webhook = await message.channel.createWebhook('OtoCevap', {
              avatar: client.user.displayAvatarURL(),
            });
          }
          const username =
            message.member?.displayName || message.author.username;
          const avatar = message.author.displayAvatarURL({ dynamic: true });
          if (cev.embed === 1) {
            const embed = new MessageEmbed()
              .setTitle(cev.title || 'Oto-Cevap')
              .setDescription(cev.response)
              .setColor('BLUE');
            const sent = await webhook
              .send({
                embeds: [embed],
                username,
                avatarURL: avatar,
              })
              .catch(() => {});
            if (opts.ephemeral && sent) {
              const ephemeralDuration = Number(opts.ephemeralSec) || 8;
              setTimeout(
                () => sent.delete().catch(() => {}),
                ephemeralDuration * 1000
              );
            }
          } else {
            const text =
              cev.response + (opts.mention ? ` <@${message.author.id}>` : '');
            const sent = await webhook
              .send({
                content: text,
                username,
                avatarURL: avatar,
              })
              .catch(() => {});
            if (opts.ephemeral && sent) {
              const ephemeralDuration = Number(opts.ephemeralSec) || 8;
              setTimeout(
                () => sent.delete().catch(() => {}),
                ephemeralDuration * 1000
              );
            }
          }
        } else {
          if (cev.embed === 1) {
            const embed = new MessageEmbed()
              .setTitle(cev.title || 'Oto-Cevap')
              .setDescription(cev.response)
              .setColor('BLUE');
            const sent = await message.channel
              .send({ embeds: [embed] })
              .catch(() => {});
            if (opts.ephemeral && sent) {
              const ephemeralDuration = Number(opts.ephemeralSec) || 8;
              setTimeout(
                () => sent.delete().catch(() => {}),
                ephemeralDuration * 1000
              );
            }
          } else {
            const text =
              cev.response + (opts.mention ? ` <@${message.author.id}>` : '');
            const sent = await message.channel.send(text).catch(() => {});
            if (opts.ephemeral && sent) {
              const ephemeralDuration = Number(opts.ephemeralSec) || 8;
              setTimeout(
                () => sent.delete().catch(() => {}),
                ephemeralDuration * 1000
              );
            }
          }
        }
      } catch (err) {
        console.error('Oto-Cevap Hata:', err);
        try {
          await message.channel
            .send(
              `${
                emojis.bot.error
              } | ✨ Oto-cevap çalıştırılırken hata oluştu: ${
                err.message || 'Bilinmeyen'
              }`
            )
            .catch(() => {});
        } catch {}
      }
    }
  }

  const engelKelimeler = (await db.get(`engelKelime_${guildId}`)) || [];
  let hasBadWord = false;
  let filteredContent = content;
  engelKelimeler.forEach((word) => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    if (regex.test(filteredContent)) {
      hasBadWord = true;
      filteredContent = filteredContent.replace(regex, '');
    }
  });
  if (hasBadWord) {
    try {
      await message.delete().catch(() => {});
      if (!filteredContent.trim()) return;
      let webhook = (await message.channel.fetchWebhooks()).find(
        (wh) => wh.name === 'AdvencedEngel'
      );
      if (!webhook) {
        webhook = await message.channel.createWebhook('AdvencedEngel', {
          avatar: client.user.displayAvatarURL(),
        });
      }
      const displayName =
        message.member?.displayName || message.author.username;
      await webhook
        .send({
          content: filteredContent.trim(),
          username: displayName,
          avatarURL: message.author.displayAvatarURL({ dynamic: true }),
        })
        .catch((err) => {
          console.error('Engel webhook hata:', err);
        });
    } catch (err) {
      console.error('Engel sistemi hatası:', err);
      try {
        await message.channel
          .send(
            `${
              emojis.bot.error
            } | ✨ Engel sistemi çalışırken bir hata oluştu: ${
              err.message || 'Bilinmeyen'
            }`
          )
          .catch(() => {});
      } catch {}
    }
  }

  {
    const userAfkKey = `afk_${userId}`;
    const afkData = await db.get(userAfkKey);
    if (afkData) {
      await db.delete(userAfkKey);
      const elapsed = Date.now() - afkData.start;
      await message
        .reply(
          `${emojis.bot.succes} | Artık AFK değilsin. **${ms(elapsed, {
            long: true,
          })}** boyunca AFK idin.`
        )
        .catch(() => {});
    }
  }

  if (message.mentions.users.size) {
    for (const [, user] of message.mentions.users) {
      if (user.bot) continue;
      const data = await db.get(`afk_${user.id}`);
      if (data) {
        await message.channel
          .send(
            `${emojis.bot.error} | <@${user.id}> şu anda AFK: ${
              data.reason || 'Belirtilmemiş'
            }`
          )
          .catch(() => {});
      }
    }
  }

  const isMentioned = message.mentions.users.has(client.user.id);
  if (
    lower.startsWith((global.botName || '').toLowerCase()) ||
    (isMentioned && lower.includes((global.botName || '').toLowerCase()))
  ) {
    const after = content.split(/\s+/).slice(1).join(' ').trim();
    if (!after) {
      return message
        .reply(
          `${emojis.bot.succes} | Benimle konuşmak için yazıgpt komutunu kullanabilir veya ${global.botName} (mesaj) yazabilirsiniz.`
        )
        .catch(() => {});
    }
    const historyKey = `destiny_history_${userId}`;
    let history = (await db.get(historyKey)) || [];
    const userContentArr = [{ type: 'text', text: after }];
    let modelToUse = 'z-ai/glm-4.5-air:free';
    const aiMessages = [
      {
        role: 'system',
        content: `Sen ${
          global.botName || 'Destiny'
        } adlı asistansın. Soruları akıcı ve Türkçe, kısa ve açıklayıcı cevapla.`,
      },
      ...(Array.isArray(history) && history.length ? history.slice(-8) : []),
      { role: 'user', content: userContentArr },
    ];
    await message.channel.sendTyping().catch(() => {});
    const typingTimer = setInterval(
      () => message.channel.sendTyping().catch(() => {}),
      8000
    );
    try {
      const aiRes = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: modelToUse,
          messages: aiMessages,
          max_tokens: 2048,
          temperature: 0.4,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${botConfig.OPENROUTER_API_KEY}`,
          },
          timeout: 60000,
        }
      );
      let aiReply = null;
      try {
        aiReply = aiRes.data.choices?.[0]?.message?.content;
        if (Array.isArray(aiReply)) {
          aiReply = aiReply
            .map((c) => (typeof c === 'string' ? c : c.text || ''))
            .join('\n');
        }
        if (typeof aiReply === 'string') aiReply = aiReply.trim();
      } catch {
        aiReply = null;
      }
      if (!aiReply) {
        return message
          .reply(
            `${emojis.bot.error} |  Yanıt alınamadı veya boş döndü. Lütfen tekrar dene, sempai~`
          )
          .catch(() => {});
      }
      const shouldChunk = aiReply.length > 1900;
      if (shouldChunk) {
        await sendWithTyping(message.channel, aiReply, { replyTo: message });
      } else {
        await message
          .reply(`${emojis.bot.succes} | ${aiReply}`)
          .catch(() => {});
      }
      history.push({ role: 'user', content: after });
      history.push({ role: 'assistant', content: aiReply });
      if (history.length > 200) history = history.slice(history.length - 200);
      await db.set(historyKey, history);
    } catch (err) {
      console.error(
        'OpenRouter hata:',
        err?.response?.data || err.message || err
      );
      if (err?.response?.status === 503) {
        try {
          await message
            .reply(
              `${emojis.bot.error} | ⚠️ 503 Error :sob:\nŞu an destiny AI yoğun, lütfen birkaç dakika sonra tekrar deneyin, sempai~`
            )
            .catch(() => {});
        } catch {}
      } else {
        try {
          await message
            .reply(
              `${
                emojis.bot.error
              } | ❌ Bir hata oluştu (OpenRouter). Lütfen daha sonra tekrar deneyin — detay: ${
                err.message || 'Bilinmeyen'
              }`
            )
            .catch(() => {});
        } catch {}
      }
    } finally {
      clearInterval(typingTimer);
    }
    return;
  }

  if (!content.startsWith(prefix)) return;

  const parts = content.slice(prefix.length).trim().split(/\s+/);
  const cmdName = parts.shift().toLowerCase();

  const candidates = [];
  client.commands.forEach((cmd, origName) => {
    candidates.push({
      entryName: origName,
      trigger: origName.toLowerCase(),
      cmd,
    });
    const aliases = cmd.help?.aliases || [];
    for (const a of aliases) {
      candidates.push({ entryName: origName, trigger: a.toLowerCase(), cmd });
    }
  });

  function userCanUse(cmd) {
    const help = cmd.help || {};
    const callerId = typeof userId !== 'undefined' ? userId : message.author.id;
    const botAdmins = Array.isArray(
      typeof admins !== 'undefined' ? admins : null
    )
      ? admins
      : Array.isArray(botConfig?.admins)
      ? botConfig.admins
      : [];
    if (typeof ownerId !== 'undefined' && callerId === ownerId) return true;
    if (Array.isArray(botAdmins) && botAdmins.includes(callerId)) return true;
    if (help.permissions) {
      const perms = Array.isArray(help.permissions)
        ? help.permissions
        : [help.permissions];
      if (!message.guild || !message.member) return false;
      try {
        return message.member.permissions.has(perms);
      } catch {
        return false;
      }
    }
    if (help.admin) {
      return Array.isArray(botAdmins) && botAdmins.includes(callerId);
    }
    return true;
  }

  let command = null;
  let commandName = null;
  for (const c of candidates) {
    if (c.trigger === cmdName) {
      if (!userCanUse(c.cmd)) {
        command = null;
        commandName = null;
      } else {
        command = c.cmd;
        commandName = c.entryName;
      }
      break;
    }
  }

  if (!command) {
    const allNames = Array.from(
      new Set(
        candidates
          .filter((c) => userCanUse(c.cmd))
          .map((c) => c.entryName.toLowerCase())
      )
    );
    const sug = allNames
      .map((n) => ({ n, d: levenshtein(cmdName, n) }))
      .filter((x) => x.d <= 3)
      .sort((a, b) => a.d - b.d)
      .slice(0, 3)
      .map((x) => `\`${prefix}${x.n}\``);
    const embed = new MessageEmbed()
      .setTitle(`${emojis.bot.error} | ❌ Komut Bulunamadı`)
      .setColor('#FF5555')
      .setThumbnail(client.user.displayAvatarURL())
      .setFooter({
        text: `${
          global.botName || botConfig?.botname || 'Bot'
        } | Komut Öneri Sistemi`,
      })
      .setDescription(
        sug.length
          ? `\`${cmdName}\` bulunamadı. Belki şunları denediniz:\n${sug.join(
              '\n'
            )}`
          : `\`${cmdName}\` bulunamadı. \`${prefix}help\` ile listeye bakabilirsiniz.`
      );
    return message.channel.send({ embeds: [embed] }).catch(() => {});
  }

  {
    if (!admins.includes(userId)) {
      const cdSec = command.cooldown || command.help?.cooldown || 5;
      const cdKey = `${commandName}Cooldown_${userId}`;
      const last = await db.get(cdKey);
      if (last && Date.now() - last < cdSec * 1000) {
        const remMs = cdSec * 1000 - (Date.now() - last);
        const remSeconds = Math.ceil(remMs / 1000);
        const timestamp = Math.floor((Date.now() + remMs) / 1000);
        const remMsg = await message
          .reply(
            `${emojis.bot.error} | ⏳ Lütfen <t:${timestamp}:R> sonra tekrar dene, sempai~`
          )
          .catch(() => {});
        setTimeout(() => {
          remMsg && remMsg.delete && remMsg.delete().catch(() => {});
          message.delete().catch(() => {});
        }, remMs);
        return;
      }
      await db.set(cdKey, Date.now());
    }
  }

  if (!admins.includes(userId) && userId !== ownerId) {
    const botbans = (await db.get('botbans')) || [];
    if (botbans.includes(userId)) {
      return message
        .reply(
          `${emojis.bot.error} | 🚫 Botdan banlı olduğunuz için hiçbir komutu kullanamazsınız.`
        )
        .catch(() => {});
    }
  }

  if (!admins.includes(userId) && userId !== ownerId) {
    const userLoan = await db.get(`loan_${userId}`);
    if (userLoan && userLoan.amount > 0 && userLoan.time) {
      const loanTime = new Date(userLoan.time).getTime();
      const now = Date.now();
      const fiveDays = 5 * 24 * 60 * 60 * 1000;
      if (now - loanTime > fiveDays && commandName !== 'ödeme') {
        return message
          .reply(
            `${emojis.bot.error} | 🚫 5 günü aşan **borcunuz (${
              userLoan.amount
            }) ${chooseEmoji(
              userLoan.amount
            )}** olduğu için komutları kullanamazsınız.\nLütfen \`${prefix}ödeme <miktar>\` komutu ile borcunuzu ödeyiniz.`
          )
          .catch(() => {});
      }
    }
  }

  try {
    await command.execute(client, message, parts);
    try {
      await client.db
        .delete(`${message.author.id}_lastCommand`)
        .catch(() => {});
    } catch {}
  } catch (err) {
    console.error(err);
    try {
      await message
        .reply(
          `${
            emojis.bot.error
          } | ✨ Aaa! Komut çalıştırılırken bir hata patladı — detay: ${
            err.message || 'Bilinmeyen'
          }\nBen de bu hatayı kaydettim, endişelenme, sempai ✨`
        )
        .catch(() => {});
    } catch {}
  }
};

function chooseEmoji(amount) {
  if (amount > 100000) return emojis.money.high;
  if (amount > 10000) return emojis.money.medium;
  return emojis.money.low;
}
