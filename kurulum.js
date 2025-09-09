// kurulum.js
// Kullanım: node kurulum.js
// Gereksinimler: Node.js ve discord.js v14
// Kurulum: npm install discord.js

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  Events,
  ChannelType,
} = require('discord.js');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});
const ask = (q) =>
  new Promise((res) => rl.question(q, (a) => res(String(a).trim())));

let botName = ''; // daha sonra kullanılacak
let PROMPT_OWNER_ID = '';
let PROMPT_PREFIX = '';
let PROMPT_OPENROUTER = '';
let PROMPT_SERPER = '';

(async () => {
  try {
    const token = await ask('Bot tokenini girin: ');
    if (!token) {
      console.log('Token girilmedi. Çıkılıyor.');
      process.exit(1);
    }

    // Ek bilgiler al
    PROMPT_PREFIX = await ask('Bot prefixini girin (örn: !): ');
    PROMPT_OWNER_ID = await ask('Owner ID girin: ');
    PROMPT_OPENROUTER = await ask('OpenRouter API key girin : ');
    PROMPT_SERPER = await ask('Serper API key girin : ');

    const client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
      ],
    });

    client.once(Events.ClientReady, async () => {
      console.log(`Giriş yapıldı: ${client.user.tag}`);

      const change = (
        await ask('Bot avatarı ve banner değiştirilsin mi? (evet/hayır): ')
      ).toLowerCase();
      if (change === 'evet' || change === 'e') {
        try {
          const avatarPath = path.join('src', 'emojiler', 'botpp.png');
          const bannerPath = path.join('src', 'emojiler', 'botbanner.jpg');

          if (fs.existsSync(avatarPath)) {
            const avatarData = fs.readFileSync(avatarPath);
            await client.user.setAvatar(avatarData);
            console.log('Bot avatarı başarıyla değiştirildi.');
          } else {
            console.log('Avatar dosyası bulunamadı:', avatarPath);
          }

          if (fs.existsSync(bannerPath)) {
            const bannerData = fs.readFileSync(bannerPath);
            try {
              await client.user.setBanner(bannerData);
              console.log('Bot bannerı başarıyla değiştirildi.');
            } catch (err) {
              console.log(
                'Banner değiştirilemedi (hesap kısıtlaması olabilir):',
                err.message
              );
            }
          } else {
            console.log('Banner dosyası bulunamadı:', bannerPath);
          }
        } catch (err) {
          console.error('Avatar/banner ayarlanırken hata oluştu:', err);
        }
      }

      botName = await ask('Botun ismini girin (şimdilik tutuluyor): ');
      console.log('İsim kaydedildi:', botName || '(boş)');

      // Davet linki oluştur (Administrator yetkisi ile)
      const inviteURL = `https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=${PermissionsBitField.Flags.Administrator}&scope=bot%20applications.commands`;
      console.log('\n== DAVET LİNKİ (Admin yetkisiyle) ==');
      console.log(inviteURL);
      console.log('Bot bir sunucuya katılmayı bekliyor...');
    });

    client.on(Events.GuildCreate, async (guild) => {
      console.log(`Bot yeni bir sunucuya katıldı: ${guild.name} (${guild.id})`);

      try {
        // 1) Sunucu ismini değiştir
        const newName = `${botName || client.user.username} Support Server`;
        try {
          await guild.setName(newName, 'Kurulum scripti tarafından ayarlandı');
          console.log('Sunucu ismi değiştirildi:', newName);
        } catch (err) {
          console.warn('Sunucu ismi değiştirilemedi:', err.message);
        }

        // 2) Sunucu ikonunu bot avatarı ile değiştir
        const avatarPath = path.join('src', 'emojiler', 'botpp.png');
        if (fs.existsSync(avatarPath)) {
          const icon = fs.readFileSync(avatarPath);
          try {
            await guild.setIcon(
              icon,
              'Sunucu ikonunu bot avatarı olarak ayarlama'
            );
            console.log('Sunucu ikonu bot avatarı ile değiştirildi.');
          } catch (err) {
            console.warn('Sunucu ikonu değiştirilemedi:', err.message);
          }
        } else {
          console.log(
            'Sunucu ikonu için avatar dosyası bulunamadı:',
            avatarPath
          );
        }

        // 3) Log kanalı oluştur veya var olanı bul
        let logChannelId = '';
        try {
          const existingLog = guild.channels.cache.find(
            (c) =>
              c.name === '✍️┃destiny・log' && c.type === ChannelType.GuildText
          );
          if (existingLog) {
            logChannelId = existingLog.id;
            console.log('Mevcut log kanalı bulundu:', logChannelId);
          } else {
            const createdLog = await guild.channels.create({
              name: '✍️┃destiny・log',
              type: ChannelType.GuildText,
              reason: 'Kurulum scripti için log kanalı',
              permissionOverwrites: [
                {
                  id: guild.roles.everyone.id,
                  deny: [PermissionsBitField.Flags.ViewChannel],
                },
                // Eğer adminlerin görmesini istersen:
                // ...adminRoleIds.map(rid => ({
                //   id: rid,
                //   allow: [PermissionsBitField.Flags.ViewChannel]
                // }))
              ],
            });
            logChannelId = createdLog.id;
            console.log('Log kanalı oluşturuldu:', logChannelId);
          }
        } catch (err) {
          console.warn('Log kanalı oluşturulurken hata:', err.message);
        }

        // 4) Emojileri yükle (src/emojiler içindeki tüm .png, botpp.png ve botbanner.jpg hariç)
        const emojisDir = path.join('src', 'emojiler');
        const uploadedMap = {};

        if (fs.existsSync(emojisDir)) {
          const files = fs
            .readdirSync(emojisDir)
            .filter((f) =>
              ['.png', '.gif'].some((ext) => f.toLowerCase().endsWith(ext))
            );
          const toUpload = files.filter(
            (f) => !['botpp.png', 'botbanner.jpg'].includes(f.toLowerCase())
          );

          console.log(`Yüklenmek üzere ${toUpload.length} png bulundu.`);

          for (const file of toUpload) {
            const full = path.join(emojisDir, file);
            const name = path.parse(file).name;
            try {
              const buffer = fs.readFileSync(full);
              const created = await guild.emojis.create({
                attachment: buffer,
                name: name,
              });
              uploadedMap[name] = created;
              console.log(`Emoji yüklendi: ${name} => ${created.id}`);
            } catch (err) {
              console.warn(`Emoji yüklenemedi: ${file} ->`, err.message);
            }
          }
        } else {
          console.log('Emojiler klasörü bulunamadı:', emojisDir);
        }

        // 5) emoji.json dosyasını src içine yaz (yüklendiyse id'leri doldur)
        const template = {
          // (aynı template içeriğini koru; sadeleştirilebilir)
          cards: {
            2: '<:maa2:>',
            3: '<:maa3:>',
            4: '<:maa4:>',
            5: '<:maa5:>',
            6: '<:maa6:>',
            7: '<:maa7:>',
            8: '<:maa8:>',
            9: '<:maa9:>',
            10: '<:maa10:>',
            J: '<:maajoker:>',
            Q: '<:maakz:>',
            K: '<:maakral:>',
            A: '<:maaas:>',
          },
          cardBack: '<:iskambilkadarkadangrn:>',
          money: {
            high: '<:cuvalDestinex:>',
            medium: '<:banknotDestinex:>',
            low: '<:Destinex:>',
          },
          slot: {
            spinning: '<a:slotd:>',
            slot1: '<:slot1:>',
            slot2: '<:slot2:>',
            slot3: '<:slot3:>',
          },
          guns: {
            bos: '<:38Specialbos:>',
            ates: '<:38Specialates:>',
          },
          coinflip: {
            spinner: '<a:dnyor:>',
            heads: '<:Destinex:>',
            tails: '<:Destinex2:>',
          },
          wifi: {
            4: '<:4tikliwifi:>',
            3: '<:3tikliwifi:>',
            2: '<:2tikliwifi:>',
            1: '<:1tikliwifi:>',
          },
          bot: {
            error: '<:error:>',
            succes: '<:succes:>',
          },
        };

        function fillIds(obj) {
          if (typeof obj === 'string') {
            return obj.replace(/<(a?):([^:>]+):>/g, (m, animatedFlag, name) => {
              const found = uploadedMap[name];
              if (found) {
                return animatedFlag === 'a'
                  ? `<a:${name}:${found.id}>`
                  : `<:${name}:${found.id}>`;
              }
              return m;
            });
          }
          if (Array.isArray(obj)) return obj.map(fillIds);
          if (obj && typeof obj === 'object') {
            const out = {};
            for (const k of Object.keys(obj)) out[k] = fillIds(obj[k]);
            return out;
          }
          return obj;
        }

        const filled = fillIds(template);

        const emojiJsonPath = path.join('src', 'emoji.json');
        try {
          fs.mkdirSync(path.dirname(emojiJsonPath), { recursive: true });
          fs.writeFileSync(
            emojiJsonPath,
            JSON.stringify(filled, null, 2),
            'utf8'
          );
          console.log('emoji.json dosyası oluşturuldu:', emojiJsonPath);
        } catch (err) {
          console.error('emoji.json oluşturulamadı:', err.message);
        }

        // 6) botConfig.js oluşturma: token, ownerId, admins, botname, serper/openrouter, supportServer, logChannelId
        await guild.members.fetch();

        // Owner / admins logic: Eğer başta girilen ownerId varsa onu kullan, yoksa sunucudan ilk üyeyi al
        let ownerId = PROMPT_OWNER_ID || '';
        if (!ownerId) {
          const nonBotMembers = guild.members.cache
            .filter((m) => !m.user.bot)
            .map((m) => m.user.id);
          ownerId = nonBotMembers[0] || '';
        }
        const adminIds = ownerId ? [ownerId] : [];

        // Destek sunucusu için kalıcı davet oluştur
        let supportInvite = '';
        try {
          const targetChannel = guild.channels.cache.find(
            (c) =>
              c.type === ChannelType.GuildText &&
              c
                .permissionsFor(guild.members.me)
                .has(PermissionsBitField.Flags.CreateInstantInvite)
          );
          if (targetChannel) {
            const invite = await targetChannel.createInvite({
              maxAge: 0,
              maxUses: 0,
              unique: true,
            });
            supportInvite = `https://discord.gg/${invite.code}`;
            console.log('Support server invite oluşturuldu:', supportInvite);
          } else {
            console.warn(
              'Invite oluşturmak için uygun kanal bulunamadı veya izin yok.'
            );
          }
        } catch (err) {
          console.warn('Invite oluşturulamadı:', err.message);
        }

        // --- TEMİZLEME: Mevcut kanallar ve roller ---
        try {
          // Kanalları sil (logChannelId'yi silme)
          for (const ch of guild.channels.cache.values()) {
            if (ch.id === logChannelId) {
              console.log('Log kanalı atlandı (silinmedi):', ch.id);
              continue;
            }
            try {
              await ch.delete('Kurulum scripti: mevcut kanalları temizleme');
            } catch (err) {
              console.warn('Kanal silinemedi:', ch.id, err.message);
            }
          }
          // Rolleri sil (@everyone hariç)
          for (const r of guild.roles.cache.values()) {
            if (r.id === guild.id) continue; // @everyone
            if (r.managed) continue; // bot/entegrasyon rolleri
            try {
              await r.delete('Kurulum scripti: mevcut rolleri temizleme');
            } catch (err) {
              console.warn('Rol silinemedi:', r.name, r.id, err.message);
            }
          }
          console.log(
            'Mevcut kanallar ve roller temizlendi (log kanalı korunarak).'
          );
        } catch (err) {
          console.warn('Temizleme sırasında hata:', err.message);
        }

        // Rol oluşturma: isim, renk, izinler
        const roleDefinitions = [
          {
            key: 'OUR_LORD',
            name: '| OUR LORD |',
            color: '#3498db',
            perms: [PermissionsBitField.Flags.Administrator],
          },
          {
            key: 'VIBE',
            name: 'Vibe | Leader',
            color: '#8e44ad',
            perms: [PermissionsBitField.Flags.Administrator],
          },
          {
            key: 'HANG',
            name: 'Hang | Administrator',
            color: '#f1c40f',
            perms: [PermissionsBitField.Flags.Administrator],
          },
          {
            key: 'QLAX',
            name: 'Qlax | Moderatör',
            color: '#e74c3c',
            perms: [
              PermissionsBitField.Flags.ManageChannels,
              PermissionsBitField.Flags.ManageMessages,
              PermissionsBitField.Flags.KickMembers,
              PermissionsBitField.Flags.BanMembers,
              PermissionsBitField.Flags.ManageRoles,
              PermissionsBitField.Flags.ModerateMembers,
            ],
          },
          {
            key: 'SLAR',
            name: 'Slar | Guide',
            color: '#2ecc71',
            perms: [
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.AddReactions,
            ],
          },
          {
            key: 'MEMBER',
            name: 'Member',
            color: '#f1c40f',
            perms: [PermissionsBitField.Flags.SendMessages],
          },
          { key: 'MUTED', name: 'Muted', color: '#000000', perms: [] },
          {
            key: 'BOT_BAKIM',
            name: 'Bot bakım - ping',
            color: '#95a5a6',
            perms: [],
          },
          {
            key: 'GUNCELLEME',
            name: 'Güncelleme - ping',
            color: '#95a5a6',
            perms: [],
          },
          {
            key: 'BOT_YENILIK',
            name: 'Bot yenilik - ping',
            color: '#95a5a6',
            perms: [],
          },
          {
            key: 'SUNUCU_YENILIK',
            name: 'Sunucu yenilik - ping',
            color: '#95a5a6',
            perms: [],
          },
          { key: 'SUPPU', name: 'şüpheli', color: '#c0392b', perms: [] },
        ];

        const createdRoles = {};
        for (const rd of roleDefinitions) {
          try {
            const r = await guild.roles.create({
              name: rd.name,
              color: rd.color,
              permissions: rd.perms,
              reason: 'Kurulum scripti: gerekli roller oluşturuluyor',
            });
            createdRoles[rd.key] = r.id;
            console.log('Rol oluşturuldu:', rd.name, r.id);
          } catch (err) {
            console.warn('Rol oluşturulamadı:', rd.name, err.message);
          }
        }

        // Kanal ve kategori oluşturma
        const createdChannels = {};

        const roleId = (key) => createdRoles[key] || null;
        const everyone = guild.roles.everyone;
        const adminRoleIds = [
          roleId('OUR_LORD'),
          roleId('VIBE'),
          roleId('HANG'),
        ].filter(Boolean);

        async function createCategory(name, permissionOverwrites = []) {
          try {
            const cat = await guild.channels.create({
              name,
              type: ChannelType.GuildCategory,
              permissionOverwrites,
              reason: 'Kurulum: kategori oluşturuluyor',
            });
            createdChannels[name] = cat.id;
            return cat;
          } catch (err) {
            console.warn('Kategori oluşturulamadı:', name, err.message);
            return null;
          }
        }

        async function createChannel(
          name,
          type,
          parent,
          permissionOverwrites = [],
          extra = {}
        ) {
          try {
            const ch = await guild.channels.create({
              name,
              type,
              parent: parent ? parent.id : undefined,
              permissionOverwrites,
              ...extra,
              reason: 'Kurulum: kanal oluşturuluyor',
            });
            createdChannels[name] = ch.id;
            console.log('Kanal oluşturuldu:', name, ch.id);
            return ch;
          } catch (err) {
            console.warn('Kanal oluşturulamadı:', name, err.message);
            return null;
          }
        }

        // Kategoriler
        const cat_pin = await createCategory('📌');
        const cat_birthday = await createCategory('🎉');
        const cat_chat = await createCategory('💬');

        // --- KANALLAR (belirtilen kurallara göre) ---

        // Yardımcı: role ID'leri
        const suppuId = roleId('SUPPU'); // şüpheli
        const mutedId = roleId('MUTED'); // muted

        // Top-level (kategori yok): mute, verify, destiny log, '.' voice
        // 1) MUTE CHAT - top-level, sadece MUTED rolü bu kanalı görebilsin ve yazabilsin; diğerleri göremez
        await createChannel(
          '🎭┃mute・chat',
          ChannelType.GuildText,
          null,
          [
            // everyone: default olarak görünmesin
            { id: everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
            // muted role: görebilsin ve yazabilsin
            mutedId
              ? {
                  id: mutedId,
                  allow: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.SendMessages,
                  ],
                }
              : null,
            // şüpheli rolü burada zaten göremez (zaten everyone deny ile birlikte)
            // admin rolleri görebilsin
            ...adminRoleIds.map((rid) => ({
              id: rid,
              allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages,
              ],
            })),
          ].filter(Boolean)
        );

        // 2) VERIFY - top-level, sadece şüpheli dışında kimse görmesin? -> talebine göre: şüpheli rolü hariç hiçbir kanalı göremesin, ama burada şüpheli görebilsin.
        // Yani: everyone deny, fakat SUPPU allow (verify'yi görebilsin), adminler görebilsin.
        await createChannel(
          '😭┃veri̇fy',
          ChannelType.GuildText,
          null,
          [
            { id: everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
            suppuId
              ? {
                  id: suppuId,
                  allow: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.SendMessages,
                  ],
                }
              : null,
            // muteliler göremez (genel kural), adminler görebilsin
            mutedId
              ? { id: mutedId, deny: [PermissionsBitField.Flags.ViewChannel] }
              : null,
            ...adminRoleIds.map((rid) => ({
              id: rid,
              allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages,
              ],
            })),
          ].filter(Boolean)
        );

        // destiny log is kept as top-level (we already created/ensured it existed - ensure in createdChannels)
        createdChannels['✍️┃destiny・log'] = logChannelId;

        // '.' voice (top-level, sadece yetkililer bağlanabilsin)
        await createChannel(
          'BOT',
          ChannelType.GuildVoice,
          null,
          [
            {
              id: everyone.id,
              deny: [
                PermissionsBitField.Flags.Connect,
                PermissionsBitField.Flags.ViewChannel,
              ],
            },
            // admin rolleri bağlanabilsin (view/connect)
            ...adminRoleIds.map((rid) => ({
              id: rid,
              allow: [
                PermissionsBitField.Flags.Connect,
                PermissionsBitField.Flags.ViewChannel,
              ],
            })),
            // şüpheli ve muted rolü bağlanamasın
            suppuId
              ? {
                  id: suppuId,
                  deny: [
                    PermissionsBitField.Flags.Connect,
                    PermissionsBitField.Flags.ViewChannel,
                  ],
                }
              : null,
            mutedId
              ? {
                  id: mutedId,
                  deny: [
                    PermissionsBitField.Flags.Connect,
                    PermissionsBitField.Flags.ViewChannel,
                  ],
                }
              : null,
          ].filter(Boolean),
          { userLimit: 0 }
        );

        // 📌 kategorisi: rol al, rules, istek şikayet
        // Burada genel kural: SUPPU ve MUTED tüm bu kanalları göremez (verify ve mute dışında).
        await createChannel(
          '📃┃rol・al',
          ChannelType.GuildText,
          cat_pin,
          [
            { id: everyone.id, deny: [PermissionsBitField.Flags.SendMessages] }, // sadece adminler yazsın
            ...adminRoleIds.map((rid) => ({
              id: rid,
              allow: [
                PermissionsBitField.Flags.SendMessages,
                PermissionsBitField.Flags.ViewChannel,
              ],
            })),
            suppuId
              ? { id: suppuId, deny: [PermissionsBitField.Flags.ViewChannel] }
              : null,
            mutedId
              ? { id: mutedId, deny: [PermissionsBitField.Flags.ViewChannel] }
              : null,
          ].filter(Boolean)
        );

        await createChannel(
          '📜┃hang・rules',
          ChannelType.GuildText,
          cat_pin,
          [
            { id: everyone.id, deny: [PermissionsBitField.Flags.SendMessages] },
            ...adminRoleIds.map((rid) => ({
              id: rid,
              allow: [PermissionsBitField.Flags.ViewChannel],
            })),
            suppuId
              ? { id: suppuId, deny: [PermissionsBitField.Flags.ViewChannel] }
              : null,
            mutedId
              ? { id: mutedId, deny: [PermissionsBitField.Flags.ViewChannel] }
              : null,
          ].filter(Boolean)
        );

        await createChannel(
          '❓┃i̇stek・şikayet',
          ChannelType.GuildText,
          cat_pin,
          [
            {
              id: everyone.id,
              allow: [
                PermissionsBitField.Flags.SendMessages,
                PermissionsBitField.Flags.ViewChannel,
              ],
              deny: [PermissionsBitField.Flags.ReadMessageHistory],
            },
            suppuId
              ? { id: suppuId, deny: [PermissionsBitField.Flags.ViewChannel] }
              : null,
            mutedId
              ? { id: mutedId, deny: [PermissionsBitField.Flags.ViewChannel] }
              : null,
          ].filter(Boolean)
        );

        // 🎉 kategorisi: announcements, invites, boosters
        await createChannel(
          '🔔・announcements',
          ChannelType.GuildText,
          cat_birthday,
          [
            { id: everyone.id, deny: [PermissionsBitField.Flags.SendMessages] },
            ...adminRoleIds.map((rid) => ({
              id: rid,
              allow: [
                PermissionsBitField.Flags.SendMessages,
                PermissionsBitField.Flags.ViewChannel,
              ],
            })),
            suppuId
              ? { id: suppuId, deny: [PermissionsBitField.Flags.ViewChannel] }
              : null,
            mutedId
              ? { id: mutedId, deny: [PermissionsBitField.Flags.ViewChannel] }
              : null,
          ].filter(Boolean)
        );

        await createChannel(
          '📬・invites',
          ChannelType.GuildText,
          cat_birthday,
          [
            { id: everyone.id, deny: [PermissionsBitField.Flags.SendMessages] },
            ...adminRoleIds.map((rid) => ({
              id: rid,
              allow: [
                PermissionsBitField.Flags.SendMessages,
                PermissionsBitField.Flags.ViewChannel,
              ],
            })),
            suppuId
              ? { id: suppuId, deny: [PermissionsBitField.Flags.ViewChannel] }
              : null,
            mutedId
              ? { id: mutedId, deny: [PermissionsBitField.Flags.ViewChannel] }
              : null,
          ].filter(Boolean)
        );

        await createChannel(
          '🌸・boosters',
          ChannelType.GuildText,
          cat_birthday,
          [
            { id: everyone.id, deny: [PermissionsBitField.Flags.SendMessages] },
            ...adminRoleIds.map((rid) => ({
              id: rid,
              allow: [
                PermissionsBitField.Flags.SendMessages,
                PermissionsBitField.Flags.ViewChannel,
              ],
            })),
            suppuId
              ? { id: suppuId, deny: [PermissionsBitField.Flags.ViewChannel] }
              : null,
            mutedId
              ? { id: mutedId, deny: [PermissionsBitField.Flags.ViewChannel] }
              : null,
          ].filter(Boolean)
        );

        // 💬 kategorisi: general ve komut
        await createChannel(
          '💬・general',
          ChannelType.GuildText,
          cat_chat,
          [
            {
              id: everyone.id,
              allow: [
                PermissionsBitField.Flags.SendMessages,
                PermissionsBitField.Flags.ViewChannel,
              ],
            },
            suppuId
              ? { id: suppuId, deny: [PermissionsBitField.Flags.ViewChannel] }
              : null,
            mutedId
              ? {
                  id: mutedId,
                  deny: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.SendMessages,
                  ],
                }
              : null,
          ].filter(Boolean)
        );

        await createChannel(
          '⚒️・komut',
          ChannelType.GuildText,
          cat_chat,
          [
            {
              id: everyone.id,
              allow: [
                PermissionsBitField.Flags.SendMessages,
                PermissionsBitField.Flags.UseApplicationCommands,
                PermissionsBitField.Flags.ViewChannel,
              ],
            },
            suppuId
              ? { id: suppuId, deny: [PermissionsBitField.Flags.ViewChannel] }
              : null,
            mutedId
              ? {
                  id: mutedId,
                  deny: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.SendMessages,
                  ],
                }
              : null,
          ].filter(Boolean)
        );

        // Geriye kalan: bom, kelime, özel oda oluştur vb.
        // ⭐ category for bom & kelime
        const cat_star = await createCategory('⭐');
        await createChannel(
          '💣bom',
          ChannelType.GuildText,
          cat_star,
          [
            {
              id: everyone.id,
              allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages,
              ],
            },
            suppuId
              ? { id: suppuId, deny: [PermissionsBitField.Flags.ViewChannel] }
              : null,
            mutedId
              ? { id: mutedId, deny: [PermissionsBitField.Flags.ViewChannel] }
              : null,
          ].filter(Boolean)
        );
        await createChannel(
          '⭐kelime',
          ChannelType.GuildText,
          cat_star,
          [
            {
              id: everyone.id,
              allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages,
              ],
            },
            suppuId
              ? { id: suppuId, deny: [PermissionsBitField.Flags.ViewChannel] }
              : null,
            mutedId
              ? { id: mutedId, deny: [PermissionsBitField.Flags.ViewChannel] }
              : null,
          ].filter(Boolean)
        );

        // ➕ category and Özel Oda Oluştur voice with userLimit:1
        const cat_plus = await createCategory('➕');
        await createChannel(
          '➕ Özel Oda Oluştur',
          ChannelType.GuildVoice,
          cat_plus,
          [
            { id: everyone.id, allow: [PermissionsBitField.Flags.Connect] },
            suppuId
              ? {
                  id: suppuId,
                  deny: [
                    PermissionsBitField.Flags.Connect,
                    PermissionsBitField.Flags.ViewChannel,
                  ],
                }
              : null,
            mutedId
              ? {
                  id: mutedId,
                  deny: [
                    PermissionsBitField.Flags.Connect,
                    PermissionsBitField.Flags.ViewChannel,
                  ],
                }
              : null,
          ].filter(Boolean),
          { userLimit: 1 }
        );

        // Oluşturulan roller/kanallar başka bir dosyaya kaydet (botConfig.js'ye değil)
        const createdData = {
          createdRoles,
          createdChannels,
          supportServer: supportInvite || '',
          logChannelId,
        };

        const createdPath = path.join('src', 'createdChannels.json');
        try {
          fs.mkdirSync(path.dirname(createdPath), { recursive: true });
          fs.writeFileSync(
            createdPath,
            JSON.stringify(createdData, null, 2),
            'utf8'
          );
          console.log('Oluşturulan kanal/rol IDleri kaydedildi:', createdPath);
        } catch (err) {
          console.error('createdChannels.json yazılamadı:', err.message);
        }

        // GÜNCELLE: botConfig.js oluştur (fakat kanal ID'lerini buraya yazmıyoruz)
        const botConfig = {
          token: token,
          prefix: PROMPT_PREFIX || '',
          admins: adminIds,
          ownerId: ownerId || '',
          botname: botName || client.user.username,
          SERPER_API_KEY: PROMPT_SERPER || '',
          OPENROUTER_API_KEY: PROMPT_OPENROUTER || '',
          supportServer: supportInvite,
          logChannelId: logChannelId,
          debug: true,
        };

        const configPath = path.join('src', 'botConfig.js');
        try {
          const configContent = `module.exports = {
  token: "${botConfig.token}",
  prefix: "${botConfig.prefix}",
  admins: ${JSON.stringify(botConfig.admins, null, 2)},
  ownerId: "${botConfig.ownerId}",
  botname: "${botConfig.botname}",
  SERPER_API_KEY: "${botConfig.SERPER_API_KEY}",
  OPENROUTER_API_KEY: "${botConfig.OPENROUTER_API_KEY}",
  supportServer: "${botConfig.supportServer}",
  logChannelId: "${botConfig.logChannelId}",
  debug: ${botConfig.debug}
};\n`;

          fs.mkdirSync(path.dirname(configPath), { recursive: true });
          fs.writeFileSync(configPath, configContent, 'utf8');
          console.log('botConfig.js oluşturuldu/güncellendi:', configPath);
        } catch (err) {
          console.error('botConfig.js yazılamadı:', err.message);
        }

        // EMOJİ KLASÖRÜNÜ SİL (kanal ID'leri kaydedildikten sonra)
        try {
          const emojisFolder = path.join('src', 'emojiler');
          if (fs.existsSync(emojisFolder)) {
            fs.rmSync(emojisFolder, { recursive: true, force: true });
            console.log('src/emojiler klasörü silindi.');
          } else {
            console.log('src/emojiler klasörü zaten yok.');
          }
        } catch (err) {
          console.warn('Emojiler klasörü silinirken hata:', err.message);
        }

        console.log('Kurulum tamamlandı. Script kapanıyor.');
        // CMD'yi kapat (scripti sonlandır)
        process.exit(0);
      } catch (err) {
        console.error(
          'Sunucu üzerinde değişiklik yapılırken hata oluştu:',
          err
        );
        // Hata durumunda scripti kapatabiliriz
        process.exit(1);
      }
    });

    client.login(token).catch((err) => {
      console.error('Bot tokeniyle giriş yapılamadı:', err.message);
      process.exit(1);
    });
  } catch (err) {
    console.error('Beklenmedik hata:', err);
    process.exit(1);
  }
})();
