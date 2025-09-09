// index.js
const autoTranslate = require('./utils/autoTranslate');
autoTranslate.patchAll();

require('events').EventEmitter.defaultMaxListeners = 400;
process.setMaxListeners(400);

const { Client, Collection, Intents } = require('discord.js');
const fs = require('fs');
const { QuickDB } = require('quick.db');

const config = require('./botConfig.js');
const debugHandler = require('./events/debug');
const items = require('./utils/items.js');

const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MEMBERS,
    Intents.FLAGS.GUILD_VOICE_STATES,
  ],
});

client.setMaxListeners(200);

client.commands = new Collection();
client.aliases = new Collection();
client.games = new Map();

const db = new QuickDB();
client.db = db;

client.eco = {
  async fetchMoney(userId) {
    const value = await db.get(`money_${userId}`);
    return Number(value) || 0;
  },
  async addMoney(userId, amount) {
    const before = await this.fetchMoney(userId);
    const after = before + amount;
    await db.set(`money_${userId}`, after);
    return { before, after };
  },
  async removeMoney(userId, amount) {
    const before = await this.fetchMoney(userId);
    const after = Math.max(before - amount, 0);
    await db.set(`money_${userId}`, after);
    return { before, after };
  },
};

module.exports = { items };

client.config = config;
global.botName = client.config?.botname || '';

function loadCommands() {
  client.commands.clear();
  client.aliases.clear();
  fs.readdir('./commands/', (err, files) => {
    if (err) return console.error('Komut dosyaları okunamadı:', err);
    files
      .filter((f) => f.endsWith('.js'))
      .forEach((file) => {
        delete require.cache[require.resolve(`./commands/${file}`)];
        const command = require(`./commands/${file}`);
        client.commands.set(command.help.name, command);
        if (Array.isArray(command.help.aliases)) {
          command.help.aliases.forEach((alias) => {
            client.aliases.set(alias, command.help.name);
          });
        }
      });
  });
}

function loadEvents() {
  fs.readdir('./events/', (err, files) => {
    if (err) return console.error('Event dosyaları okunamadı:', err);
    files
      .filter((f) => f.endsWith('.js'))
      .forEach((file) => {
        delete require.cache[require.resolve(`./events/${file}`)];
        const event = require(`./events/${file}`);
        const eventName = file.split('.')[0];
        client.removeAllListeners(eventName);
        client.on(eventName, (...args) => event(client, ...args));
      });
  });
}

loadCommands();
loadEvents();

const path = require('path');

const restartFilePath = path.join(__dirname, 'restart.txt');
let _shuttingDownForRestart = false;

// check every 1s
function _checkForRestartFileAndShutdown() {
  if (_shuttingDownForRestart) return;
  try {
    if (fs.existsSync(restartFilePath)) {
      _shuttingDownForRestart = true;
      console.log(
        '[index.js] restart.txt detected -> delete it, then graceful shutdown.'
      );

      // try delete restart.txt (launcher might also try; ignore errors)
      try {
        fs.unlinkSync(restartFilePath);
        console.log('[index.js] restart.txt deleted by index.js.');
      } catch (e) {
        console.warn(
          '[index.js] could not delete restart.txt (ignored):',
          e.message
        );
      }

      // attempt graceful shutdown of discord client
      try {
        if (client && typeof client.destroy === 'function') {
          client.destroy();
          console.log('[index.js] client.destroy() called.');
        }
      } catch (err) {
        console.error('[index.js] error while destroying client:', err);
      }

      // stop the interval and exit shortly
      clearInterval(_restartPoll);
      setTimeout(() => {
        console.log(
          '[index.js] exiting process to allow launcher to restart cmd.'
        );
        process.exit(0);
      }, 500);
    }
  } catch (e) {
    console.warn('[index.js] restart watcher error (ignored):', e.message);
  }
}

const _restartPoll = setInterval(_checkForRestartFileAndShutdown, 1000);

// cleanup if process exits otherwise
process.on('exit', () => clearInterval(_restartPoll));
process.on('SIGINT', () => {
  clearInterval(_restartPoll);
  process.exit(0);
});
process.on('SIGTERM', () => {
  clearInterval(_restartPoll);
  process.exit(0);
});

client.once('ready', () => {
  console.log(`✅ ${client.user.tag} başarıyla giriş yaptı!`);
});

client.ws.on('debug', (info) => {
  debugHandler(client, { debug: info, shardId: client.shard?.ids[0] ?? 0 });
});

client.login(client.config.token).catch((err) => {
  console.error('❌ Bot giriş yaparken hata oluştu:', err);
});
