// kurulum2.js
const fs = require('fs');
const path = require('path');
const { QuickDB } = require('quick.db');
const { Client, GatewayIntentBits } = require('discord.js');
const botConfig = require('./src/botConfig.js');

// Token
const token = botConfig.token;
if (!token) {
  console.error('Hata: botConfig.js içinde token bulunamadı.');
  process.exit(1);
}

// QuickDB'yi src klasörü içinde başlat
const dbPath = path.join(__dirname, 'src', 'json.sqlite');
const db = new QuickDB({ filePath: dbPath });

// Discord client
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});
client.db = db;

// createdChannels.json yolu (src içinde)
const createdPath = path.join(__dirname, 'src', 'createdChannels.json');
if (!fs.existsSync(createdPath)) {
  console.error('Hata: createdChannels.json bulunamadı.');
  process.exit(1);
}

// JSON oku
const { createdRoles, createdChannels } = JSON.parse(
  fs.readFileSync(createdPath, 'utf8')
);

client.once('ready', async () => {
  console.log(`Bot hazır: ${client.user.tag}`);

  for (const [guildId, guild] of client.guilds.cache) {
    // 1) verify
    await client.db.set(`verify_${guild.id}`, {
      roleIDs: [createdRoles.MEMBER],
      channelID: createdChannels['😭┃veri̇fy'],
      customRoleID: createdRoles.SUPPU,
    });

    // 2) privateses
    await client.db.set(`privateses_${guild.id}`, {
      categoryId: createdChannels['➕'],
      hubId: createdChannels['➕ Özel Oda Oluştur'],
    });

    // 3) bom
    await client.db.set(`bom_${guild.id}`, createdChannels['💣bom']);

    // 4) kelime
    await client.db.set(`kelime_${guild.id}`, createdChannels['⭐kelime']);

    // 5) autoVC
    const dbKey = `autoVC_${guild.id}`;
    await client.db.set(dbKey, createdChannels['BOT']); // sadece ID kaydediyoruz
  }

  // işlemler bittikten sonra createdChannels.json dosyasını sil
  fs.unlinkSync(createdPath);
  console.log('createdChannels.json silindi. Kurulum tamamlandı.');
  process.exit(0);
});

client.login(token);
