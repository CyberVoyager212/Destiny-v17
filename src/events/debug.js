const { MessageEmbed } = require('discord.js');
const botConfig = require('../botConfig.js');
const os = require('os');
const util = require('util');
const fs = require('fs');

const SPAM_PROTECT_WINDOW_MS = 10_000;
const SPAM_PROTECT_MAX = 5;
const STACK_MAX_LENGTH = 1800;
const KEEP_LOGS_LOCAL = true;

if (KEEP_LOGS_LOCAL) {
  try { if (!fs.existsSync('./logs')) fs.mkdirSync('./logs'); } catch (e) { console.error('Log klasörü oluşturulamadı', e); }
}

const ISSUE_CATALOG = [
  'MissingToken', 'InvalidToken', 'MissingIntents', 'MissingPermissions', 'RateLimit',
  'GatewayDisconnect', 'ShardDisconnect', 'HTTP500', 'UnknownMessage', 'UnknownUser',
  'UnknownChannel', 'MissingEmbedPermission', 'MessageTooLong', 'JSONParseError', 'SyntaxError',
  'UnhandledRejection', 'UncaughtException', 'DatabaseConnectionFailed', 'MongoNetworkError', 'VoiceConnectionError',
  'OpusEngineError', 'FileSystemError', 'EACCES', 'ENOTFOUND', 'Timeout',
  'FetchError', 'AxiosError', 'DiscordAPIError', 'TooManyRequests', 'WSClose1006',
  'WSClose4014', 'ClientDestroyed', 'TokenRevoked', 'CommandHandlerError', 'EventHandlerError',
  'PermissionOverwriteError', 'EmojiNotFound', 'ReactionError', 'DMBlocked', 'AttachmentTooLarge',
];

const recentReports = [];
function canSendReport() {
  const now = Date.now();
  for (let i = recentReports.length - 1; i >= 0; i--) if (now - recentReports[i] > SPAM_PROTECT_WINDOW_MS) recentReports.splice(i, 1);
  if (recentReports.length >= SPAM_PROTECT_MAX) return false;
  recentReports.push(now);
  return true;
}

function detectIssueType(err) {
  if (!err) return 'Unknown';
  const msg = (err && (err.code || err.message || String(err)))?.toString() || '';
  const stack = (err && err.stack) || '';
  const combined = (msg + '\n' + stack).toLowerCase();

  const patterns = [
    [/token|invalid authentication|401/, 'InvalidToken'],
    [/missing intents|privileged intents|intents required/, 'MissingIntents'],
    [/missing permission|missing perms|insufficient permission/, 'MissingPermissions'],
    [/rate limited|rate limit|429/, 'RateLimit'],
    [/gateway.*close|gateway.*disconnect/, 'GatewayDisconnect'],
    [/shard.*disconnect|shard.*resume|shard.*reconnect/, 'ShardDisconnect'],
    [/500|internal server error/, 'HTTP500'],
    [/unknown message|unknown message|Unknown Message/, 'UnknownMessage'],
    [/unknown user|unknown member|Unknown User/, 'UnknownUser'],
    [/unknown channel|Unknown Channel/, 'UnknownChannel'],
    [/cannot send embed|embeds? are disabled|missing embed permission/, 'MissingEmbedPermission'],
    [/message too long|max length/, 'MessageTooLong'],
    [/json.*parse|unexpected token in json|json parse error/, 'JSONParseError'],
    [/syntax error/, 'SyntaxError'],
    [/unhandled promise rejection|unhandledrejection/, 'UnhandledRejection'],
    [/uncaught exception|uncaughtexception/, 'UncaughtException'],
    [/mongo|mongodb|mongoose|db.*connection/, 'DatabaseConnectionFailed'],
    [/mongo network error|failed to connect to server.*on first connect/, 'MongoNetworkError'],
    [/voice|voice.*connection|opus|pcm|voice.*error/, 'VoiceConnectionError'],
    [/libopus|opusscript|opus/, 'OpusEngineError'],
    [/eacces|permission denied/, 'EACCES'],
    [/enotfound|getaddrinfo|dns lookup error/, 'ENOTFOUND'],
    [/timeout|timed out|ETIMEDOUT/, 'Timeout'],
    [/fetcherror|networkerror|failed to fetch|axios error/, 'FetchError'],
    [/axios|axioserror/, 'AxiosError'],
    [/discordapierror|discord api error/, 'DiscordAPIError'],
    [/too many requests|429/, 'TooManyRequests'],
    [/close 1006|ws close 1006/, 'WSClose1006'],
    [/close 4014|4014/, 'WSClose4014'],
    [/client.*destroy|client destroyed/, 'ClientDestroyed'],
    [/token revoked|token.*revok/, 'TokenRevoked'],
    [/command.*error|command handler|command failed/, 'CommandHandlerError'],
    [/event.*error|event handler/, 'EventHandlerError'],
    [/permission overwrite|overwrite.*error/, 'PermissionOverwriteError'],
    [/emoji not found|unknown emoji/, 'EmojiNotFound'],
    [/reaction.*error|reaction.*failed/, 'ReactionError'],
    [/cannot send messages to this user|cannot dm user|dm blocked/, 'DMBlocked'],
    [/file too large|attachment.*too large/, 'AttachmentTooLarge'],
    [/animestyle/, 'AnimestyleModuleError'],
  ];

  for (const [re, tag] of patterns) if (re.test(combined)) return tag;
  return 'Unknown';
}

function makeEmbed(title, description, fields = []) {
  const embed = new MessageEmbed()
    .setTitle(title)
    .setDescription(description?.slice(0, 2048) || 'No description')
    .setTimestamp(new Date())
    .setFooter({ text: `Node ${process.version} • ${os.platform()} ${os.arch()}` });

  const mapped = fields.map(f => ({ name: f.name || '\u200b', value: f.value?.slice(0, 1024) || '\u200b', inline: !!f.inline }));
  if (mapped.length) embed.addFields(mapped);
  return embed;
}

async function reportError(client, err, context = {}) {
  try {
    if (!canSendReport()) return console.warn('[debug.js] Rapor spam koruması devrede — atlandı');

    const issue = detectIssueType(err);

    // Eğer zaten bir rate limit olayı ile karşılaşıldıysa, kanala gönderme denemesi yapmayalım.
    // Ayrıca context.skipChannel ile manuel olarak da bu davranışı tetikleyebiliriz.
    if (issue === 'RateLimit' || context.skipChannel) {
      console.warn('[debug.js] RateLimit veya skipChannel tespit edildi — kanal gönderimi atlanıyor. Lokal log tutuluyor.');
      if (KEEP_LOGS_LOCAL) {
        try {
          const stackLocal = (err && (err.stack || String(err))) || 'Yok';
          fs.appendFileSync(`./logs/error_${new Date().toISOString().slice(0,10)}.log`, `\n--- ${new Date().toISOString()} ---\n[SKIP_CHANNEL] ${issue}\n${stackLocal}\nContext: ${JSON.stringify(context)}\n`);
        } catch (e) { console.error('[debug.js] Local log yazılamadı (skip channel)', e); }
      }
      return;
    }

    const title = `Hata: ${issue}`;
    const description = `${(err && err.message) || String(err) || 'Bilinmeyen hata'}\n\nContext: ${context.note || '—'}`;

    const stack = (err && (err.stack || String(err))) || 'Yok';
    const shortStack = stack.length > STACK_MAX_LENGTH ? stack.slice(0, STACK_MAX_LENGTH) + '\n... (truncated)' : stack;

    const fields = [
      { name: 'Tip', value: issue, inline: true },
      { name: 'Node Uptime', value: `${process.uptime().toFixed(2)}s`, inline: true },
      { name: 'Bellek', value: `${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`, inline: true },
      { name: 'Stack (kısa)', value: '```\n' + shortStack.replace(/```/g, "` ` `") + '\n```' },
      { name: 'Context', value: JSON.stringify({ event: context.event || 'unknown', extra: context.extra || null }, null, 2).slice(0, 1024) },
    ];

    const embed = makeEmbed(title, description, fields);

    if (KEEP_LOGS_LOCAL) {
      try {
        fs.appendFileSync(`./logs/error_${new Date().toISOString().slice(0,10)}.log`, `\n--- ${new Date().toISOString()} ---\n${issue}\n${stack}\nContext: ${JSON.stringify(context)}\n`);
      } catch (e) { console.error('Local log hatası', e); }
    }

    let channelId = botConfig && botConfig.logChannelId;
    if (!channelId) {
      console.warn('[debug.js] botConfig.logChannelId tanımlı değil. Konsola yazılıyor.');
      return console.error(stack);
    }

    let channel = client.channels.cache.get(channelId);
    if (!channel) {
      try { channel = await client.channels.fetch(channelId); } catch (e) { console.error('[debug.js] Kanal fetch hatası', e); }
    }

    if (!channel) {
      console.warn('[debug.js] Log kanalı bulunamadı, konsola yazılıyor.');
      return console.error(stack);
    }

    try {
      await channel.send({ embeds: [embed] });
    } catch (sendErr) {
      const s = String(sendErr).toLowerCase();
      // Eğer gönderim sırasında rate limit (429) alındıysa, tekrar reportError tetiklemeyelim — local log yeterli.
      if (s.includes('rate limit') || s.includes('429') || /too many requests/.test(s)) {
        console.warn('[debug.js] Kanal gönderimi sırasında rate limit (429) alındı. Local log yazıldı ve gönderim atlandı.');
        try {
          if (KEEP_LOGS_LOCAL) fs.appendFileSync(`./logs/error_${new Date().toISOString().slice(0,10)}.log`, `\n--- ${new Date().toISOString()} ---\n[SEND_FAILED_RATE_LIMIT]\n${String(sendErr)}\nContext: ${JSON.stringify(context)}\n`);
        } catch (e) { console.error('[debug.js] Local log yazılamadı (send failed rate limit)', e); }
        return;
      }

      // Başka bir hata ise, embed gönderimi yerine kısa metin olarak deneyelim.
      try {
        const text = `**${title}**\n${description}\n\n\`\`\`\n${shortStack}\n\`\`\``.slice(0, 2000);
        await channel.send({ content: text });
      } catch (finalErr) {
        console.error('[debug.js] Kanal gönderme başarısız, konsola yazılıyor.', finalErr);
      }
    }
  } catch (fatal) {
    console.error('[debug.js] Raporlama sırasında hata oluştu', fatal);
  }
}

const initializedClients = new WeakSet();
let moduleInitialized = false;

module.exports = (client) => {
  if (!client) throw new Error('debug.js: client parametresi gerekli');

  if (initializedClients.has(client)) return;
  initializedClients.add(client);

  if (!moduleInitialized) {
    console.log('[debug.js] Hata/çökme raporlama başlatıldı. Log kanalı:', botConfig && botConfig.logChannelId);
    moduleInitialized = true;
  }

  client.on('error', (err) => reportError(client, err, { event: 'client.error' }));
  client.on('shardError', (err) => reportError(client, err, { event: 'client.shardError' }));
  client.on('warn', (info) => reportError(client, new Error(info), { event: 'client.warn' }));

  // ÖNEMLİ: rateLimit olaylarını doğrudan reportError ile kanala göndermek döngü yaratır.
  // Burada sadece lokal log ve konsol uyarısı tutuyoruz.
  client.on('rateLimit', (info) => {
    try {
      console.warn('[debug.js] client.rateLimit alındı — kanala gönderim atlandı. Info:', info);
      if (KEEP_LOGS_LOCAL) fs.appendFileSync(`./logs/rate_limit_${new Date().toISOString().slice(0,10)}.log`, `\n--- ${new Date().toISOString()} ---\n${JSON.stringify(info)}\n`);
    } catch (e) { console.error('[debug.js] rateLimit log hatası', e); }
  });

  client.on('shardDisconnect', (event, shardID) => reportError(client, new Error(`shardDisconnect ${shardID}`), { event: 'client.shardDisconnect', extra: { event, shardID } }));
  client.on('invalidated', () => reportError(client, new Error('Client invalidated (session reset)'), { event: 'client.invalidated' }));

  if (client.ws && client.ws.on) {
    try {
      client.ws.on('debug', (m) => {
        if (typeof m === 'string' && m.toLowerCase().includes('animestyle')) reportError(client, new Error(m), { event: 'ws.debug', note: 'Animestyle içerikli WS mesajı (debug)' });
      });
    } catch (e) { }
  }

  process.on('unhandledRejection', (reason, promise) => reportError(client, reason || new Error('Unhandled rejection with no reason'), { event: 'process.unhandledRejection' }));
  process.on('rejectionHandled', (promise) => reportError(client, new Error('Rejection handled after the fact'), { event: 'process.rejectionHandled' }));
  process.on('uncaughtException', (err) => reportError(client, err, { event: 'process.uncaughtException' }));
  process.on('uncaughtExceptionMonitor', (err) => reportError(client, err, { event: 'process.uncaughtExceptionMonitor' }));
  process.on('warning', (warning) => reportError(client, warning, { event: 'process.warning' }));

  const exitHandler = (signal) => async () => {
    await reportError(client, new Error(`Process terminated with signal ${signal}`), { event: `process.signal.${signal}` });
  };
  process.on('SIGINT', exitHandler('SIGINT'));
  process.on('SIGTERM', exitHandler('SIGTERM'));

  client.safeEmit = async function (fn, context = {}) {
    try { await Promise.resolve(fn()); }
    catch (err) { await reportError(client, err, Object.assign({ event: 'client.safeEmit' }, context)); }
  };

  client.wrapHandler = function (handler) {
    return async function (...args) {
      try { return await handler(...args); }
      catch (err) { await reportError(client, err, { event: 'handler.failure', extra: { args } }); }
    };
  };
};
