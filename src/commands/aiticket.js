const { Permissions, MessageActionRow, MessageButton } = require('discord.js');
const axios = require('axios');
const { QuickDB } = require('quick.db');
const db = new QuickDB();
const config = require('../botConfig.js') || {};
const emojis = require('../emoji.json') || {};

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL =
  config.OPENROUTER_DEFAULT_MODEL || 'x-ai/grok-4-fast:free';
const INACTIVITY_MS = config.AITICKET_INACTIVITY_MS || 5 * 60 * 1000; // 5 min default
const OPENROUTER_API_KEY =
  config.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY;

const ticketConversations = {};
let globalListenersAttached = false;

module.exports = {
  name: 'aiticket',
  description:
    'AI destekli ticket kanalı oluşturur ve kapsamlı moderasyon verisi ile beslenir.',
  usage: 'aiticket [oluştur|restart]',
  category: 'Araçlar',
  cooldown: 5,
  async execute(client, message, args) {
    if (!message.guild) {
      return safeMessageReply(
        message,
        `${emojis.bot?.error || '❌'} Bu komut sadece sunucuda kullanılabilir.`
      );
    }
    const member = message.member;
    const guild = message.guild;
    const sub = (args && args[0] && String(args[0]).toLowerCase()) || 'oluştur';

    if (sub === 'restart') {
      try {
        const restored = await handleRestart(client, guild, member);
        if (restored) {
          return safeMessageReply(
            message,
            `${emojis.bot?.succes || '✅'} Ticket geri yüklendi: ${restored}`
          );
        } else {
          return safeMessageReply(
            message,
            `${
              emojis.bot?.error || '⚠️'
            } Kullanıcı için açık bir aiticket kanalı bulunamadı.`
          );
        }
      } catch (e) {
        console.error('aiticket restart hata', e);
        return safeMessageReply(
          message,
          `${emojis.bot?.error || '❌'} Restart sırasında hata: ${
            e.message || String(e)
          }`
        );
      }
    }

    const rawName = `${member.user.username}`;
    const channelName =
      sanitizeChannelName(`aiticket-${rawName}`) + `-${member.id.slice(0, 6)}`;

    const existing = guild.channels.cache.find(
      (c) =>
        c.name.startsWith(
          sanitizeChannelName(`aiticket-${member.user.username}`)
        ) &&
        c.permissionOverwrites &&
        c.permissionOverwrites.cache.some(
          (po) =>
            po.id === member.id &&
            po.allow?.has &&
            po.allow.has(Permissions.FLAGS.VIEW_CHANNEL)
        )
    );
    if (existing) {
      return safeMessageReply(
        message,
        `${
          emojis.bot?.error || '⚠️'
        } Zaten açık bir ticket kanalı var: ${existing}`
      );
    }

    let channel;
    try {
      channel = await guild.channels.create(channelName, {
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
              Permissions.FLAGS.MANAGE_CHANNELS,
            ],
          },
        ],
      });
    } catch (e) {
      console.error('aiticket: kanal oluşturulamadı', e);
      return safeMessageReply(
        message,
        `${emojis.bot?.error || '❌'} Kanal oluşturulamadı: ${
          e.message || String(e)
        }`
      );
    }

    // Sunucu snapshot ve bot komutları
    const serverSnapshot = await buildServerSnapshot(guild);
    const botCommands = await getBotCommands(client);

    // EK: kullanıcı hakkında daha geniş veri topla
    const extraUserData = await gatherMoreUserData(guild, member, client, {
      channelLimit: 8,
      perChannelLimit: 30,
    });

    // sistem mesajı (AI'ye vereceğimiz bağlam)
    const systemContent = `Sen ${
      config.botname || client.user.username
    } adlı moderatör botusun. Kısa, net ve moderatör üslubunda cevap ver.
Sunucu bilgisi özet: ${serverSnapshot}.
Bot komutları: ${botCommands}.
Kullanıcı detayları: 
- Tag: ${member.user.tag} (${member.id})
- Joined:${
      extraUserData.joinedAt || member.joinedAt?.toISOString() || 'unknown'
    } Created:${
      extraUserData.createdAt ||
      member.user.createdAt?.toISOString() ||
      'unknown'
    } IsBot:${extraUserData.isBot || member.user.bot}
- Avatar:${
      extraUserData.avatar ||
      member.user.displayAvatarURL?.({ dynamic: true, size: 128 }) ||
      'none'
    } 
- Presence:${
      (extraUserData.presence && extraUserData.presence.status) ||
      (member.presence && member.presence.status) ||
      'unknown'
    } 
- Flags:${(extraUserData.flags || []).join(', ') || 'none'}
- MutualGuilds:${extraUserData.mutualGuilds || 0}
- RolesSummary: total:${
      extraUserData.roleSummary?.totalRoles || member.roles.cache.size || 0
    } top:${(extraUserData.roleSummary?.topRoles || []).slice(0, 5).join(', ')}
- RecentMessageSample: ${
      (extraUserData.recentMessages || [])
        .slice(-6)
        .map(
          (m) =>
            `[${m.time}] ${m.channel}: ${String(m.content)
              .slice(0, 120)
              .replace(/\n/g, ' ')}${
              m.attachments && m.attachments.length ? ' [att]' : ''
            }`
        )
        .join(' || ') || 'none'
    }
- NickChangeAuditSample: ${
      (extraUserData.nickChanges || [])
        .slice(-6)
        .map((n) => `${n.action} by ${n.executor} (${n.createdAt})`)
        .join(' | ') || 'none'
    }

NOT: Yanıtlar kısa olsun; kanıta dayalı tavsiye ver.`;

    ticketConversations[channel.id] = {
      creatorId: member.id,
      messages: [{ role: 'system', content: systemContent }],
      collectors: {},
    };

    const delBtn = new MessageButton()
      .setCustomId(`aiticket_delete_${channel.id}`)
      .setLabel('Kanali Sil')
      .setStyle('DANGER');
    const row = new MessageActionRow().addComponents(delBtn);

    const intro = `AI Ticket Kanalı Oluşturuldu

Burası senin özel AI ticket kanalın. Sorunu buraya yaz. ${Math.floor(
      INACTIVITY_MS / 1000 / 60
    )} dakika boyunca mesaj gelmezse kanal otomatik silinecek.

Not: Yanıtlar kısa ve net olacaktır (moderator üslubu).
Oluşturan: ${member.user.tag}
`;
    try {
      await channel.send({ content: intro, components: [row] });
    } catch (e) {
      console.warn('aiticket: ilk mesaj gönderilemedi', e);
    }

    startCollectors(client, channel);
    attachGlobalListeners(client);
    return safeMessageReply(
      message,
      `${emojis.bot?.succes || '✅'} Ticket oluşturuldu: ${channel}`
    );
  },
};

// ---------- Global listener attach ----------
function attachGlobalListeners(client) {
  if (globalListenersAttached) return;
  globalListenersAttached = true;

  client.on('channelDelete', (channel) => {
    if (!channel) return;

    for (const [key, convo] of Object.entries(ticketConversations)) {
      if (key === channel.id || convo.channelId === channel.id) {
        try {
          if (convo.collectors) {
            if (convo.collectors.msg && !convo.collectors.msg.ended) {
              convo.collectors.msg.stop();
            }
            if (convo.collectors.comp && !convo.collectors.comp.ended) {
              convo.collectors.comp.stop();
            }
          }
        } catch (e) {}

        try {
          clearInactivityTimer(key);
        } catch (e) {}

        delete ticketConversations[key];
      }
    }
  });
}

// ---------- Collectors / Message handling ----------
function startCollectors(client, channel) {
  if (!channel) return;
  const channelId = channel.id;
  const hist = ticketConversations[channelId];
  if (!hist) return;

  const filter = (m) => !m.author.bot;
  const msgCollector = channel.createMessageCollector({
    filter,
    idle: INACTIVITY_MS,
  });

  msgCollector.on('collect', async (msg) => {
    try {
      const content = msg.content || '';
      const lower = content.trim().toLowerCase();

      // Moderation helper commands within the ticket
      if (lower.startsWith('!islem') || lower.startsWith('!işlem')) {
        const parts = content.split(/\s+/);
        const sub = parts[1] ? parts[1].toLowerCase() : '';
        if (sub === 'analiz') {
          const mention = msg.mentions.members.first();
          if (!mention) {
            await sendPlain(
              channel,
              `${
                emojis.bot?.error || '⚠️'
              } Kullanıcıyı etiketleyin. Örn: !islem analiz @kullanici`
            );
            return;
          }
          const allowed =
            msg.author.id === hist.creatorId ||
            msg.member.permissions.has(Permissions.FLAGS.MANAGE_GUILD) ||
            msg.member.permissions.has(Permissions.FLAGS.MANAGE_ROLES);
          if (!allowed) {
            await sendPlain(
              channel,
              `${emojis.bot?.error || '❌'} Bu işlemi yapmaya yetkiniz yok.`
            );
            return;
          }
          await sendPlain(
            channel,
            `${emojis.bot?.succes || '✅'} Analiz hazırlanıyor...`
          );
          const data = await gatherMemberDataForAnalysis(
            channel.guild,
            mention,
            client
          );
          const prompt = buildAnalysisPrompt(
            mention,
            data.recentMessages,
            data.serverSnapshot,
            data.activity,
            data.audit,
            data.infractions,
            data.extraUserData
          );
          try {
            if (channel && channel.sendTyping) channel.sendTyping();
          } catch (e) {}
          const ai = await fetchChatFromOpenRouter(
            [
              { role: 'system', content: hist.messages[0].content },
              { role: 'user', content: prompt },
            ],
            DEFAULT_MODEL,
            channel
          );
          await sendLargeMessage(channel, `Analiz:\n\n${ai.text}`);
          return;
        }

        if (sub === 'uygula') {
          const action = parts[2] ? parts[2].toLowerCase() : '';
          const mention = msg.mentions.members.first();
          const allowed =
            msg.author.id === hist.creatorId ||
            msg.member.permissions.has(Permissions.FLAGS.MANAGE_GUILD) ||
            msg.member.permissions.has(Permissions.FLAGS.BAN_MEMBERS) ||
            msg.member.permissions.has(Permissions.FLAGS.KICK_MEMBERS);
          if (!allowed) {
            await sendPlain(
              channel,
              `${emojis.bot?.error || '❌'} Bu işlemi yapmaya yetkiniz yok.`
            );
            return;
          }
          if (!action) {
            await sendPlain(
              channel,
              `${
                emojis.bot?.error || '⚠️'
              } Kullanım: !islem uygula <ban|kick|addrole|removerole|lock|unlock> @üye [role|sebep]`
            );
            return;
          }

          // ban
          if (action === 'ban') {
            if (!mention) {
              await sendPlain(
                channel,
                `${emojis.bot?.error || '⚠️'} Ban için üye etiketleyin.`
              );
              return;
            }
            if (!msg.member.permissions.has(Permissions.FLAGS.BAN_MEMBERS)) {
              await sendPlain(
                channel,
                `${emojis.bot?.error || '❌'} Ban izniniz yok.`
              );
              return;
            }
            const reason = parts.slice(3).join(' ') || 'No reason provided';
            try {
              await mention.ban({ reason });
              await sendPlain(
                channel,
                `${emojis.bot?.succes || '✅'} ${
                  mention.user.tag
                } banlandı. Sebep: ${reason}`
              );
              await saveInfraction(msg.guild.id, mention.id, {
                type: 'ban',
                reason,
                date: new Date().toISOString(),
                moderator: msg.author.tag,
              });
              await saveTranscript(channelId, hist.messages || []);
            } catch (e) {
              console.error('ban hata', e);
              await sendPlain(
                channel,
                `${emojis.bot?.error || '❌'} Ban yapılamadı: ${
                  e.message || String(e)
                }`
              );
            }
            return;
          }

          // kick
          if (action === 'kick') {
            if (!mention) {
              await sendPlain(
                channel,
                `${emojis.bot?.error || '⚠️'} Kick için üye etiketleyin.`
              );
              return;
            }
            if (!msg.member.permissions.has(Permissions.FLAGS.KICK_MEMBERS)) {
              await sendPlain(
                channel,
                `${emojis.bot?.error || '❌'} Kick izniniz yok.`
              );
              return;
            }
            const reason = parts.slice(3).join(' ') || 'No reason provided';
            try {
              await mention.kick(reason);
              await sendPlain(
                channel,
                `${emojis.bot?.succes || '✅'} ${
                  mention.user.tag
                } sunucudan atıldı. Sebep: ${reason}`
              );
              await saveInfraction(msg.guild.id, mention.id, {
                type: 'kick',
                reason,
                date: new Date().toISOString(),
                moderator: msg.author.tag,
              });
              await saveTranscript(channelId, hist.messages || []);
            } catch (e) {
              console.error('kick hata', e);
              await sendPlain(
                channel,
                `${emojis.bot?.error || '❌'} Kick yapılamadı: ${
                  e.message || String(e)
                }`
              );
            }
            return;
          }

          // addrole / removerole
          if (action === 'addrole' || action === 'removerole') {
            if (!mention) {
              await sendPlain(
                channel,
                `${emojis.bot?.error || '⚠️'} Rol işlemi için üye etiketleyin.`
              );
              return;
            }
            const roleName = parts.slice(3).join(' ');
            if (!roleName) {
              await sendPlain(
                channel,
                `${
                  emojis.bot?.error || '⚠️'
                } Lütfen rol adını belirtin. Örn: !islem uygula addrole @üye Moderatör`
              );
              return;
            }
            const role = msg.guild.roles.cache.find(
              (r) => r.name.toLowerCase() === roleName.toLowerCase()
            );
            if (!role) {
              await sendPlain(
                channel,
                `${emojis.bot?.error || '⚠️'} Rol bulunamadı: ${roleName}`
              );
              return;
            }
            if (!msg.member.permissions.has(Permissions.FLAGS.MANAGE_ROLES)) {
              await sendPlain(
                channel,
                `${emojis.bot?.error || '❌'} Rol yönetme izniniz yok.`
              );
              return;
            }
            try {
              if (action === 'addrole') {
                await mention.roles.add(role);
                await sendPlain(
                  channel,
                  `${emojis.bot?.succes || '✅'} ${role.name} rolü ${
                    mention.user.tag
                  } kullanıcısına verildi.`
                );
                await saveInfraction(msg.guild.id, mention.id, {
                  type: 'role_add',
                  role: role.name,
                  date: new Date().toISOString(),
                  moderator: msg.author.tag,
                });
              } else {
                await mention.roles.remove(role);
                await sendPlain(
                  channel,
                  `${emojis.bot?.succes || '✅'} ${role.name} rolü ${
                    mention.user.tag
                  } kullanıcısından alındı.`
                );
                await saveInfraction(msg.guild.id, mention.id, {
                  type: 'role_remove',
                  role: role.name,
                  date: new Date().toISOString(),
                  moderator: msg.author.tag,
                });
              }
              await saveTranscript(channelId, hist.messages || []);
            } catch (e) {
              console.error('role hata', e);
              await sendPlain(
                channel,
                `${emojis.bot?.error || '❌'} Rol işlemi başarısız: ${
                  e.message || String(e)
                }`
              );
            }
            return;
          }

          // lock / unlock
          if (action === 'lock' || action === 'unlock') {
            if (
              !msg.member.permissions.has(Permissions.FLAGS.MANAGE_CHANNELS)
            ) {
              await sendPlain(
                channel,
                `${emojis.bot?.error || '❌'} Kanal yönetme izniniz yok.`
              );
              return;
            }
            try {
              const everyone = msg.guild.roles.everyone;
              if (action === 'lock') {
                await channel.permissionOverwrites.edit(everyone, {
                  SEND_MESSAGES: false,
                });
                await sendPlain(
                  channel,
                  `${emojis.bot?.succes || '✅'} Kanal kilitlendi.`
                );
                await saveInfraction(msg.guild.id, 'channel_lock', {
                  type: 'lock',
                  channel: channel.name,
                  date: new Date().toISOString(),
                  moderator: msg.author.tag,
                });
              } else {
                await channel.permissionOverwrites.edit(everyone, {
                  SEND_MESSAGES: null,
                });
                await sendPlain(
                  channel,
                  `${emojis.bot?.succes || '✅'} Kanal kilidi kaldırıldı.`
                );
                await saveInfraction(msg.guild.id, 'channel_unlock', {
                  type: 'unlock',
                  channel: channel.name,
                  date: new Date().toISOString(),
                  moderator: msg.author.tag,
                });
              }
              await saveTranscript(channelId, hist.messages || []);
            } catch (e) {
              console.error('lock hata', e);
              await sendPlain(
                channel,
                `${emojis.bot?.error || '❌'} Kanal işlemi başarısız: ${
                  e.message || String(e)
                }`
              );
            }
            return;
          }

          await sendPlain(
            channel,
            `${emojis.bot?.error || '⚠️'} Bilinmeyen uygulama komutu.`
          );
          return;
        }

        await sendPlain(
          channel,
          `${
            emojis.bot?.error || '⚠️'
          } Bilinmeyen işlem. Kullanım: !islem <analiz|uygula ...>`
        );
        return;
      }

      // Normal mesaj: AI'ye gönderilecek
      const normalized = normalizeIncomingMessage(msg);
      hist.messages.push({ role: 'user', content: normalized });

      try {
        if (channel && channel.sendTyping) channel.sendTyping();
      } catch (e) {}
      const messagesToSend = pruneHistory([...hist.messages], 50000);
      const aiResp = await fetchChatFromOpenRouter(
        messagesToSend,
        DEFAULT_MODEL,
        channel
      );
      const text = aiResp.text || 'Üzgünüm, yanıt alınamadı.';
      hist.messages.push({ role: 'assistant', content: text });
      await sendLargeMessage(channel, text);
    } catch (e) {
      console.error('aiticket: işleme hata', e);
      try {
        await sendPlain(
          msg.channel,
          `${emojis.bot?.error || '❌'} AI servisinden yanıt alınamadı.`
        );
      } catch (err) {}
    }
  });

  msgCollector.on('end', async (collected, reason) => {
    if (reason === 'idle' || reason === 'time') {
      try {
        await sendPlain(
          channel,
          `${emojis.bot?.error || '⏳'} ${Math.floor(
            INACTIVITY_MS / 1000 / 60
          )} dakika boyunca etkinlik olmadığından kanal otomatik silinecek.`
        );
      } catch (e) {}
      try {
        await saveTranscript(channelId, hist.messages || []);
        delete ticketConversations[channelId];
        await channel.delete(
          `AITicket: inactivity timeout (${INACTIVITY_MS}ms)`
        );
      } catch (e) {
        console.warn('aiticket: inactivity delete hatası', e);
      }
    }
  });

  const compCollector = channel.createMessageComponentCollector({
    componentType: 'BUTTON',
    time: 0,
  });
  compCollector.on('collect', async (interaction) => {
    if (!interaction.isButton()) return;
    const cid = interaction.customId;
    if (!cid) return;
    if (cid.startsWith('aiticket_delete_')) {
      await safeDefer(interaction);
      const channelIdFromCid = cid.split('_').slice(2).join('_');
      if (channelIdFromCid !== channel.id) {
        return safeInteractionRespond(interaction, {
          content: `${
            emojis.bot?.error || '⚠️'
          } Bu buton bu kanalda geçerli değil.`,
          ephemeral: true,
        });
      }
      const allowed =
        interaction.user.id === hist.creatorId ||
        interaction.member.permissions.has(Permissions.FLAGS.MANAGE_CHANNELS);
      if (!allowed) {
        return safeInteractionRespond(interaction, {
          content: `${
            emojis.bot?.error || '❌'
          } Kanalı yalnızca oluşturucu veya yönetici silebilir.`,
          ephemeral: true,
        });
      }
      try {
        await saveTranscript(channel.id, hist.messages || []);
      } catch (e) {
        console.warn('Transcript kaydedilemedi:', e);
      }
      try {
        if (hist.collectors) {
          if (hist.collectors.msg && !hist.collectors.msg.ended)
            hist.collectors.msg.stop();
          if (hist.collectors.comp && !hist.collectors.comp.ended)
            hist.collectors.comp.stop();
        }
      } catch (e) {}
      try {
        await channel.delete(
          `AITicket: ${interaction.user.tag} tarafından silindi`
        );
      } catch (e) {
        console.error('aiticket: kanal silinemedi', e);
        return interaction.followUp({
          content: `${emojis.bot?.error || '❌'} Kanal silinirken hata: ${
            e.message || String(e)
          }`,
          ephemeral: true,
        });
      }
    }
  });

  hist.collectors = { msg: msgCollector, comp: compCollector };
}

// ---------- Util & helpers ----------
function pruneHistory(messages, maxChars = 30000) {
  if (!Array.isArray(messages) || messages.length <= 1) return messages;
  let total = messages.reduce(
    (s, m) => s + (m.content ? m.content.length : 0),
    0
  );
  while (total > maxChars && messages.length > 2) {
    const idx = messages.findIndex((m, i) => i > 0 && m.role === 'user');
    if (idx === -1) break;
    const removed1 = messages.splice(idx, 1);
    total -= removed1.reduce(
      (s, m) => s + (m.content ? m.content.length : 0),
      0
    );
    if (messages[idx] && messages[idx].role === 'assistant') {
      const removed2 = messages.splice(idx, 1);
      total -= removed2.reduce(
        (s, m) => s + (m.content ? m.content.length : 0),
        0
      );
    }
  }
  return messages;
}

function normalizeIncomingMessage(msg) {
  let content = msg.content || '';
  if (msg.attachments && msg.attachments.size) {
    const urls = msg.attachments.map((a) => a.proxyURL || a.url).join('\n');
    content += `\n[attachments]\n${urls}`;
  }
  if (msg.embeds && msg.embeds.length) {
    const e = msg.embeds[0];
    const embedSummary =
      (e.title ? `Title: ${e.title}\n` : '') +
      (e.description ? `Desc: ${e.description}\n` : '') +
      (e.fields && e.fields.length
        ? `Fields: ${e.fields.map((f) => `${f.name}: ${f.value}`).join('; ')}\n`
        : '');
    content += `\n[embed]\n${embedSummary}`;
  }
  return content.trim();
}

async function postWithRetry(url, payload, headers, options = {}) {
  const maxRetries = options.retries ?? 3;
  let delay = 500;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await axios.post(url, payload, {
        headers,
        timeout: options.timeout || 40000,
      });
      return res;
    } catch (e) {
      if (attempt === maxRetries - 1) throw e;
      await new Promise((r) => setTimeout(r, delay));
      delay *= 2;
    }
  }
}

async function fetchChatFromOpenRouter(
  messages,
  model = DEFAULT_MODEL,
  channel = null
) {
  if (!OPENROUTER_API_KEY) throw new Error('OpenRouter API anahtarı yok.');
  messages = pruneHistory(messages, 50000);
  const payload = { model, messages, max_tokens: 1200, temperature: 0.7 };
  try {
    if (channel && channel.sendTyping) channel.sendTyping();
  } catch (e) {}
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${OPENROUTER_API_KEY}`,
  };
  let res;
  try {
    res = await postWithRetry(OPENROUTER_URL, payload, headers, {
      retries: 3,
      timeout: 60000,
    });
  } catch (e) {
    console.error('OpenRouter POST hata (retry sonrası):', e.message || e);
    throw e;
  }
  const data = res.data;
  const choice = data?.choices && data.choices[0] ? data.choices[0] : null;
  const candidate = choice?.message ?? choice ?? data;
  let text = null;
  if (candidate) {
    if (typeof candidate === 'string') text = candidate;
    else if (typeof candidate === 'object')
      text =
        candidate.content ??
        candidate.text ??
        candidate.output_text ??
        JSON.stringify(candidate);
  }
  if (!text && typeof data === 'string') text = data;
  if (!text) text = 'AI yanıtı alınamadı.';
  return { text: String(text).trim() };
}

async function saveTranscript(channelId, messagesArray) {
  try {
    await db.set(`aiticket_transcript_${channelId}`, messagesArray || []);
  } catch (e) {
    console.warn('saveTranscript hata:', e);
  }
}

async function getTranscript(channelId) {
  try {
    return (await db.get(`aiticket_transcript_${channelId}`)) || null;
  } catch (e) {
    console.warn('getTranscript hata:', e);
    return null;
  }
}

async function saveInfraction(guildId, memberId, infraction) {
  try {
    const key = `modlog_${guildId}_${memberId}`;
    const cur = (await db.get(key)) || [];
    cur.push(infraction);
    await db.set(key, cur);
  } catch (e) {
    console.warn('saveInfraction hata:', e);
  }
}

function sanitizeChannelName(name) {
  if (!name) return 'aiticket';
  let n = String(name).toLowerCase();
  n = n.replace(/\s+/g, '-');
  n = n.replace(/[./#]/g, '');
  n = n.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  n = n.replace(/[^a-z0-9-_]/g, '');
  if (n.length > 90) n = n.slice(0, 90);
  if (!n) n = 'aiticket';
  return n;
}

async function sendPlain(channel, text) {
  if (!channel || !text) return;
  const chunks = splitMessage(text, 1990);
  for (const c of chunks) {
    try {
      await channel.send({ content: c });
    } catch (e) {}
  }
}

async function sendLargeMessage(channel, text) {
  if (!channel) return;
  const chunks = splitMessage(text, 1990);
  for (const c of chunks) {
    try {
      await channel.send({ content: c });
    } catch (e) {}
  }
}

function splitMessage(text, maxLen) {
  if (!text) return [''];
  if (text.length <= maxLen) return [text];
  const parts = [];
  let remaining = text;
  while (remaining.length > maxLen) {
    let sliceAt = remaining.lastIndexOf('\n', maxLen);
    if (sliceAt <= 0) sliceAt = maxLen;
    parts.push(remaining.slice(0, sliceAt));
    remaining = remaining.slice(sliceAt);
  }
  if (remaining.length) parts.push(remaining);
  return parts;
}

// ---------- Server/member data gathering (gelişmiş) ----------
async function buildServerSnapshot(guild) {
  try {
    const roles = Array.from(guild.roles.cache.values())
      .sort((a, b) => b.position - a.position)
      .slice(0, 50)
      .map((r) => `${r.name}(${r.id})`);
    const channels = Array.from(guild.channels.cache.values()).map(
      (c) => `${c.name}[${c.type}](${c.id})`
    );
    const botCount = guild.members.cache.filter(
      (m) => m.user && m.user.bot
    ).size;
    const owner = await guild.fetchOwner().catch(() => null);
    const boosts = guild.premiumSubscriptionCount || 0;
    const verification = guild.verificationLevel || 'UNKNOWN';
    const created = guild.createdAt
      ? guild.createdAt.toISOString().split('T')[0]
      : 'unknown';
    const membersSample = Array.from(guild.members.cache.values())
      .slice(0, 40)
      .map((m) => `${m.user.tag}(${m.id})`);
    const channelsDetail = await Promise.all(
      Array.from(guild.channels.cache.values())
        .slice(0, 100)
        .map(async (c) => {
          try {
            const perms = [];
            const overwrites = c.permissionOverwrites
              ? Array.from(c.permissionOverwrites.cache.values())
              : [];
            for (const ow of overwrites.slice(0, 30)) {
              const id = ow.id;
              const allow = ow.allow?.toArray
                ? ow.allow.toArray().join(',')
                : String(ow.allow);
              const deny = ow.deny?.toArray
                ? ow.deny.toArray().join(',')
                : String(ow.deny);
              perms.push(`${id}:allow(${allow}) deny(${deny})`);
            }
            return `${c.id}|${c.name}|${c.type}|${perms.join(';')}`;
          } catch (e) {
            return `${c.id}|${c.name}|${c.type}|perm_error`;
          }
        })
    );
    return [
      `Name:${guild.name}`,
      `ID:${guild.id}`,
      `Owner:${owner ? `${owner.user.tag}(${owner.id})` : 'unknown'}`,
      `Created:${created}`,
      `Members:${guild.memberCount}`,
      `Bots:${botCount}`,
      `Boosts:${boosts}`,
      `Verification:${verification}`,
      `TopRoles:${roles.slice(0, 20).join(',')}`,
      `MembersSample:${membersSample.join(',')}`,
      `ChannelsDetail:${channelsDetail.slice(0, 40).join('||')}`,
    ].join(' | ');
  } catch (e) {
    return `Sunucu bilgisi alınamadı: ${e.message || e}`;
  }
}

async function fetchRecentMessages(channel, limit = 50) {
  try {
    const fetched = await channel.messages.fetch({ limit });
    return Array.from(fetched.values())
      .reverse()
      .map((m) => ({
        author: m.author.tag,
        authorId: m.author.id,
        content: m.content || '',
        time: m.createdAt.toISOString(),
        attachments: m.attachments
          ? m.attachments.map((a) => a.proxyURL || a.url)
          : [],
      }));
  } catch (e) {
    return [];
  }
}

async function fetchMemberActivity(
  guild,
  member,
  channelLimit = 8,
  perChannelLimit = 50
) {
  try {
    const textChannels = Array.from(guild.channels.cache.values())
      .filter((c) => c.type === 'GUILD_TEXT' && c.viewable)
      .slice(0, channelLimit);
    let totalMessages = 0;
    const lastMessages = [];
    for (const ch of textChannels) {
      try {
        const msgs = await ch.messages.fetch({ limit: perChannelLimit });
        const byMember = Array.from(msgs.values()).filter(
          (m) => m.author.id === member.id
        );
        totalMessages += byMember.length;
        for (const m of byMember.slice(-5)) {
          lastMessages.push({
            channel: ch.name,
            content: m.content || '',
            time: m.createdAt.toISOString(),
            attachments: m.attachments
              ? m.attachments.map((a) => a.proxyURL || a.url)
              : [],
          });
        }
      } catch (err) {
        continue;
      }
    }
    lastMessages.sort((a, b) => new Date(a.time) - new Date(b.time));
    const voiceChannels = Array.from(guild.channels.cache.values())
      .filter(
        (c) => c.type === 'GUILD_VOICE' && c.members && c.members.has(member.id)
      )
      .map((c) => c.name);
    return {
      totalMessages,
      lastMessages: lastMessages.slice(-40),
      voiceChannels,
      scannedChannels: textChannels.map((c) => c.name),
    };
  } catch (e) {
    return {
      totalMessages: 0,
      lastMessages: [],
      voiceChannels: [],
      scannedChannels: [],
    };
  }
}

async function fetchModerationHistoryFromAuditLogs(guild, member) {
  try {
    if (!guild || !guild.fetchAuditLogs) return [];
    const logs = await guild.fetchAuditLogs({ limit: 200 }).catch(() => null);
    if (!logs) return [];
    const entries = Array.from(logs.entries.values())
      .filter((e) => e.target && e.target.id === member.id)
      .slice(0, 50)
      .map((e) => {
        return {
          action: e.action,
          executor: e.executor
            ? `${e.executor.tag}(${e.executor.id})`
            : 'unknown',
          reason: e.reason || '',
          createdAt: e.createdAt ? e.createdAt.toISOString() : '',
        };
      });
    return entries;
  } catch (e) {
    return [];
  }
}

async function getInfractionsFromDB(guildId, memberId) {
  try {
    const key = `modlog_${guildId}_${memberId}`;
    const data = await db.get(key);
    if (!data || !Array.isArray(data)) return [];
    return data.slice(-50);
  } catch (e) {
    return [];
  }
}

// ---------- Genişletilmiş kullanıcı veri toplama ----------
async function getUserFlagsSafe(user) {
  try {
    if (user.flags && typeof user.flags.toArray === 'function') {
      return user.flags.toArray();
    }
    const fetched = await user.fetch().catch(() => null);
    if (
      fetched &&
      fetched.flags &&
      typeof fetched.flags.toArray === 'function'
    ) {
      return fetched.flags.toArray();
    }
    return [];
  } catch (e) {
    return [];
  }
}

async function fetchMemberMessagesAcrossChannels(
  guild,
  member,
  channelLimit = 12,
  perChannelLimit = 50
) {
  const textChannels = Array.from(guild.channels.cache.values())
    .filter((c) => c.type === 'GUILD_TEXT' && c.viewable)
    .slice(0, channelLimit);
  const msgs = [];
  for (const ch of textChannels) {
    try {
      const fetched = await ch.messages.fetch({ limit: perChannelLimit });
      const byMember = Array.from(fetched.values()).filter(
        (m) => m.author && m.author.id === member.id
      );
      for (const m of byMember.slice(-10)) {
        msgs.push({
          channel: ch.name,
          content: m.content || '',
          time: m.createdAt ? m.createdAt.toISOString() : '',
          attachments: m.attachments
            ? m.attachments.map((a) => a.proxyURL || a.url)
            : [],
        });
      }
    } catch (e) {
      continue;
    }
  }
  msgs.sort((a, b) => new Date(a.time) - new Date(b.time));
  return msgs.slice(-100);
}

async function fetchNicknameChangesFromAuditLogs(guild, member, limit = 200) {
  try {
    if (!guild.fetchAuditLogs) return [];
    const logs = await guild.fetchAuditLogs({ limit }).catch(() => null);
    if (!logs) return [];
    const entries = Array.from(logs.entries.values())
      .filter((e) => e.target && e.target.id === member.id)
      .map((e) => {
        return {
          action: e.action,
          executor: e.executor
            ? `${e.executor.tag}(${e.executor.id})`
            : 'unknown',
          reason: e.reason || '',
          createdAt: e.createdAt ? e.createdAt.toISOString() : '',
        };
      });
    return entries.slice(-50);
  } catch (e) {
    return [];
  }
}

function summarizeRoles(member) {
  try {
    const roles = member.roles.cache.map((r) => ({
      id: r.id,
      name: r.name,
      position: r.position,
      permissions: r.permissions ? r.permissions.toArray() : [],
    }));
    const adminRoles = roles
      .filter((r) => r.permissions && r.permissions.includes('ADMINISTRATOR'))
      .map((r) => r.name);
    return {
      totalRoles: roles.length,
      topRoles: roles.slice(0, 10).map((r) => r.name),
      adminRoles,
    };
  } catch (e) {
    return { totalRoles: 0, topRoles: [], adminRoles: [] };
  }
}

async function gatherMoreUserData(guild, member, client, options = {}) {
  const channelLimit = options.channelLimit ?? 12;
  const perChannelLimit = options.perChannelLimit ?? 50;
  try {
    const avatar =
      member.user.displayAvatarURL?.({ dynamic: true, size: 256 }) || null;
    const presence = member.presence
      ? {
          status: member.presence.status,
          activities: (member.presence.activities || []).map((a) => ({
            type: a.type,
            name: a.name,
            details: a.details || '',
          })),
        }
      : {};
    const flags = await getUserFlagsSafe(member.user);
    const mutualGuilds =
      client && client.guilds
        ? client.guilds.cache.filter((g) => g.members.cache.has(member.id)).size
        : 0;
    const roleSummary = summarizeRoles(member);
    const recentMessages = await fetchMemberMessagesAcrossChannels(
      guild,
      member,
      channelLimit,
      perChannelLimit
    );
    const nickChanges = await fetchNicknameChangesFromAuditLogs(
      guild,
      member,
      200
    );
    return {
      avatar,
      presence,
      flags,
      mutualGuilds,
      roleSummary,
      recentMessages,
      nickChanges,
      joinedAt: member.joinedAt ? member.joinedAt.toISOString() : null,
      createdAt: member.user.createdAt
        ? member.user.createdAt.toISOString()
        : null,
      isBot: member.user.bot,
    };
  } catch (e) {
    return { error: e.message || String(e) };
  }
}

async function gatherMemberDataForAnalysis(guild, member, client) {
  try {
    const serverSnapshot = await buildServerSnapshot(guild);
    const activity = await fetchMemberActivity(guild, member, 8, 75);
    const audit = await fetchModerationHistoryFromAuditLogs(guild, member);
    const infractions = await getInfractionsFromDB(guild.id, member.id);
    const extraUserData = await gatherMoreUserData(guild, member, client, {
      channelLimit: 12,
      perChannelLimit: 50,
    });
    const recentMessages = extraUserData.recentMessages || [];
    return {
      serverSnapshot,
      recentMessages,
      activity,
      audit,
      infractions,
      extraUserData,
    };
  } catch (e) {
    return {
      serverSnapshot: await buildServerSnapshot(guild),
      recentMessages: [],
      activity: null,
      audit: [],
      infractions: [],
      extraUserData: {},
    };
  }
}

function buildAnalysisPrompt(
  member,
  recentMessages,
  serverSnapshot,
  activity = null,
  audit = [],
  infractions = [],
  extraUserData = {}
) {
  const roleNames = member.roles.cache.map((r) => r.name).join(', ') || 'None';
  const joined = member.joinedAt
    ? member.joinedAt.toISOString().split('T')[0]
    : 'unknown';
  const created = member.user.createdAt
    ? member.user.createdAt.toISOString().split('T')[0]
    : 'unknown';
  const isBot = member.user.bot ? 'yes' : 'no';
  const lastMsgs =
    (recentMessages || [])
      .slice(-50)
      .map((m) => `[${m.time}] ${m.channel}: ${m.content}`)
      .join('\n') || 'none';
  const activitySummary = activity
    ? `TotalMessagesScanned:${activity.totalMessages} | VoiceChannels:${
        activity.voiceChannels.join(', ') || 'none'
      } | Scanned:${activity.scannedChannels.join(',')}`
    : '';
  const extraSummary = extraUserData
    ? `Flags:${(extraUserData.flags || []).join(', ') || 'none'} | Presence:${
        (extraUserData.presence && extraUserData.presence.status) || 'none'
      } | MutualGuilds:${extraUserData.mutualGuilds || 0} | RolesTotal:${
        extraUserData.roleSummary?.totalRoles || 0
      }`
    : '';
  const auditSummary = audit.length
    ? audit
        .map(
          (a) =>
            `${a.action} by ${a.executor} (${a.createdAt}) reason:${a.reason}`
        )
        .join('\n')
    : 'none';
  const infra = infractions.length
    ? infractions
        .map(
          (i) =>
            `${i.type || 'note'}:${i.reason || i.note || ''} date:${
              i.date || i.time || ''
            }`
        )
        .join('\n')
    : 'none';
  return [
    `USER:${member.user.tag} (${member.id})`,
    `AccountCreated:${created}`,
    `Joined:${joined}`,
    `IsBot:${isBot}`,
    `Roles:${roleNames}`,
    `ExtraUserSummary:${extraSummary}`,
    `ServerSnapshot:${serverSnapshot}`,
    `ActivitySummary:${activitySummary}`,
    `RecentMessagesSample:${lastMsgs}`,
    `AuditLogMatches:${auditSummary}`,
    `InfractionsDB:${infra}`,
    `Instructions: Short, factual moderator-style assessment. Give 1-3 suggested actions (ban/kick/warn/mute/monitor) with brief reasons. Highlight urgency and evidence pointers. If flags/presence or recentMessages show suspicious behaviour, call it out and show exact evidence lines.`,
  ].join('\n\n');
}

// ---------- restart handler ----------
async function handleRestart(client, guild, member) {
  const found = guild.channels.cache.find(
    (c) =>
      c.name.startsWith(
        sanitizeChannelName(`aiticket-${member.user.username}`)
      ) &&
      c.permissionOverwrites &&
      c.permissionOverwrites.cache.some(
        (po) =>
          po.id === member.id &&
          po.allow?.has &&
          po.allow.has(Permissions.FLAGS.VIEW_CHANNEL)
      )
  );
  if (!found) return null;
  const channel = found;
  const serverSnapshot = await buildServerSnapshot(guild);
  const systemContent = `Sen ${
    config.botname || client.user.username
  } adlı moderatör botusun. Kullanıcıya kısa, net ve moderatör üslubunda cevap ver. Sunucu bilgisi: ${serverSnapshot}`;
  let fetched;
  try {
    fetched = await channel.messages.fetch({ limit: 200 });
  } catch (e) {
    fetched = null;
  }
  const msgs = fetched ? Array.from(fetched.values()).reverse() : [];
  const history = [];
  for (const m of msgs) {
    if (m.author && m.author.bot && m.author.id !== client.user.id) continue;
    if (m.author && m.author.id === member.id) {
      if (m.content && m.content.trim())
        history.push({ role: 'user', content: m.content });
    } else if (m.author && (m.author.bot || m.author.id === client.user.id)) {
      let text = m.content || '';
      if ((!text || !text.trim()) && m.embeds && m.embeds.length) {
        const e = m.embeds[0];
        text =
          e.description ||
          (e.fields ? e.fields.map((f) => f.value).join('\n') : '') ||
          e.title ||
          '';
      }
      if (text && text.trim())
        history.push({ role: 'assistant', content: text });
    }
  }
  ticketConversations[channel.id] = {
    creatorId: member.id,
    messages: [{ role: 'system', content: systemContent }, ...history],
    collectors: {},
  };
  startCollectors(client, channel);
  const intro =
    'AI Ticket Geri Yüklendi\n\nTicket geçmişi belleğe yüklendi. Kapatma butonu yeniden eklendi.';
  try {
    await channel.send({ content: intro });
  } catch (e) {}
  return channel;
}
async function getBotCommands(client) {
  try {
    const cmds = client.commands ? Array.from(client.commands.values()) : [];
    const list = cmds
      .map(
        (c) =>
          `${(c.help && c.help.name) || c.name}:${
            (c.help && c.help.description) || ''
          }`
      )
      .slice(0, 200)
      .join(', ');
    return list || 'none';
  } catch (e) {
    console.warn('getBotCommands hata:', e);
    return 'bot commands unavailable';
  }
}
// ---------- safe interaction helpers ----------
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

async function safeDefer(interaction) {
  try {
    if (!interaction.deferred && !interaction.replied)
      return await interaction.deferUpdate();
  } catch (e) {}
}

async function safeInteractionRespond(interaction, payload = {}) {
  try {
    if (!interaction.deferred && !interaction.replied)
      return await interaction.reply(payload);
    else return await interaction.followUp(payload);
  } catch (e) {
    try {
      if (!interaction.replied) return await interaction.reply(payload);
      return await interaction.followUp(payload);
    } catch (err) {
      console.error('safeInteractionRespond hata:', err);
    }
  }
}

// Export help bilgi
module.exports.help = {
  name: 'aiticket',
  aliases: [],
  usage: 'aiticket [oluştur|restart]',
  description:
    'AI destekli ticket kanalı oluşturur. Gelişmiş moderasyon verileri ile analiz yapar ve işlem uygular.',
  category: 'Araçlar',
  cooldown: 5,
};
