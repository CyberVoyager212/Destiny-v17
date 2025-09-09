const { MessageEmbed } = require('discord.js');
const { items = [], valuableItems = [] } = require('../index.js');
const emojis = require('../emoji.json');

const SECRET_PASSWORD = '5499238724234232445';

const CONFIG = {
  MAX_TIMEOUT: 2147483647,
  COLLECTION_BASE_MS: 60 * 60 * 1000,
  COLLECTION_INCREMENT_MS: 0.25 * 60 * 60 * 1000,
  ITEMS_PER_LEVEL: 50,
  HUNT_COIN_CONVERSION_RATE: 0.5,
  HUNT_MULTIPLIER_INCREMENT: 0.02,
  HUNT_MULTIPLIER_CAP: 3.0,
  STREAK_WINDOW_MS: 48 * 60 * 60 * 1000,
  STREAK_BONUS_PER: 0.01,
  STREAK_BONUS_CAP: 0.5,
  LUCK_BASE: 0.01,
  PASSIVE_INCOME_FACTOR: 0.001,
  BOOSTERS: {
    small: {
      cost: 200,
      multiplier: 1.25,
      uses: 1,
      durationMs: 12 * 60 * 60 * 1000,
    },
    medium: {
      cost: 500,
      multiplier: 1.5,
      uses: 1,
      durationMs: 24 * 60 * 60 * 1000,
    },
    large: {
      cost: 1200,
      multiplier: 2.0,
      uses: 1,
      durationMs: 48 * 60 * 60 * 1000,
    },
  },
  UPGRADE_BASE_COST: 250,
  MAX_LEVEL: 250,
  COST_UPGRADE_MAX: 10,
  WATCHDOG_INTERVAL_MS: 60 * 1000,
  PRESTIGE_COST: 5000,
};

const schedulerState = { timeouts: new Map(), userLocks: new Map() };

function animeTitle(t) {
  return `✨ ${t} ✨`;
}
function animeLine() {
  return '╰☆╮';
}

function chooseEmoji(amount) {
  if (!amount || isNaN(amount)) return emojis.money.low;
  if (amount > 100000) return emojis.money.high;
  if (amount > 10000) return emojis.money.medium;
  return emojis.money.low;
}
function createProgressBar(current, max, length = 10) {
  const filled = Math.max(
    0,
    Math.min(length, Math.round((current / Math.max(1, max)) * length))
  );
  const bar = '█'.repeat(filled) + '░'.repeat(length - filled);
  return `[${bar}] **${current}/${max}**`;
}
function nowMs() {
  return Date.now();
}
function formatDuration(ms) {
  if (!ms || ms <= 0) return '0s';
  const s = Math.floor(ms / 1000) % 60;
  const m = Math.floor(ms / (1000 * 60)) % 60;
  const h = Math.floor(ms / (1000 * 60 * 60));
  const parts = [];
  if (h) parts.push(`${h} saat`);
  if (m) parts.push(`${m} dakika`);
  if (!h && s) parts.push(`${s} saniye`);
  return parts.join(' ');
}
function getMaxItemValue(qualityLevel) {
  qualityLevel = Number(qualityLevel) || 1;
  return 500 + (qualityLevel - 1) * 10;
}
function getCollectableItems(qualityLevel) {
  const max = getMaxItemValue(qualityLevel);
  return items.concat(valuableItems).filter((it) => Number(it.value) <= max);
}
function getCollectionTimeMs(cooldownTimeLevel) {
  const level = Math.max(1, Number(cooldownTimeLevel) || 1);
  return (
    CONFIG.COLLECTION_BASE_MS + (level - 1) * CONFIG.COLLECTION_INCREMENT_MS
  );
}

async function dbGet(client, key, fallback = null) {
  const v = await client.db.get(key);
  return typeof v === 'undefined' || v === null ? fallback : v;
}
async function dbSet(client, key, value) {
  await client.db.set(key, value);
}
async function dbDelete(client, key) {
  if (client.db.delete) await client.db.delete(key);
  else await client.db.set(key, null);
}

async function getAllTasks(client) {
  return await dbGet(client, 'hunt_tasks', []);
}
async function saveAllTasks(client, tasks) {
  await dbSet(client, 'hunt_tasks', tasks || []);
}
async function addTask(client, task) {
  const tasks = await getAllTasks(client);
  tasks.push(task);
  await saveAllTasks(client, tasks);
}
async function removeTask(client, taskId) {
  const tasks = await getAllTasks(client);
  const filtered = tasks.filter((t) => t.id !== taskId);
  if (filtered.length === tasks.length) return false;
  await saveAllTasks(client, filtered);
  return true;
}

async function getHuntBalance(client, userId) {
  return (await dbGet(client, `huntbal_${userId}`, 0)) || 0;
}
async function addHuntBalance(client, userId, amount) {
  const cur = await getHuntBalance(client, userId);
  const next = Math.max(0, Math.floor(cur + Number(amount || 0)));
  await dbSet(client, `huntbal_${userId}`, next);
  const users = await dbGet(client, 'hunt_users', []);
  if (!users.includes(userId)) {
    users.push(userId);
    await dbSet(client, 'hunt_users', users);
  }
  return next;
}
async function removeHuntBalance(client, userId, amount) {
  const cur = await getHuntBalance(client, userId);
  const next = Math.max(0, cur - Math.floor(Number(amount || 0)));
  await dbSet(client, `huntbal_${userId}`, next);
  return next;
}
async function getInventory(client, userId) {
  return await dbGet(client, `inventory_${userId}`, []);
}
async function setInventory(client, userId, arr) {
  await dbSet(client, `inventory_${userId}`, arr || []);
}

async function getHuntMultiplier(client, userId) {
  return (await dbGet(client, `hunt_mult_${userId}`, 1)) || 1;
}
async function bumpHuntMultiplier(
  client,
  userId,
  amount = CONFIG.HUNT_MULTIPLIER_INCREMENT
) {
  const cur = await getHuntMultiplier(client, userId);
  const next = Math.min(CONFIG.HUNT_MULTIPLIER_CAP, cur + Number(amount));
  await dbSet(client, `hunt_mult_${userId}`, next);
  return next;
}
async function getStreak(client, userId) {
  return (
    (await dbGet(client, `hunt_streak_${userId}`, { count: 0, lastAt: 0 })) || {
      count: 0,
      lastAt: 0,
    }
  );
}
async function updateStreakOnHunt(client, userId) {
  const s = await getStreak(client, userId);
  const now = nowMs();
  if (now - Number(s.lastAt || 0) <= CONFIG.STREAK_WINDOW_MS) {
    s.count = Number(s.count || 0) + 1;
  } else {
    s.count = 1;
  }
  s.lastAt = now;
  await dbSet(client, `hunt_streak_${userId}`, s);
  return s;
}
async function getLuck(client, userId) {
  return (await dbGet(client, `hunt_luck_${userId}`, 0)) || 0;
}

async function getPendingPayment(client, type, userId) {
  return (await dbGet(client, `pending_${type}_${userId}`, 0)) || 0;
}
async function addPendingPayment(client, type, userId, amount) {
  const cur = await getPendingPayment(client, type, userId);
  const next = Math.max(0, Math.floor(cur + Number(amount || 0)));
  await dbSet(client, `pending_${type}_${userId}`, next);
  return next;
}
async function clearPendingPayment(client, type, userId) {
  await dbSet(client, `pending_${type}_${userId}`, 0);
}
async function getAutoUpgrade(client, userId) {
  return await dbGet(client, `hunt_autoUpgrade_${userId}`, false);
}
async function setAutoUpgrade(client, userId, val) {
  await dbSet(client, `hunt_autoUpgrade_${userId}`, !!val);
}
async function getPrestige(client, userId) {
  return await dbGet(client, `hunt_prestige_${userId}`, {
    level: 0,
    multiplier: 1,
  });
}

async function attemptPrestige(client, userId) {
  const bal = await getHuntBalance(client, userId);
  if (bal < CONFIG.PRESTIGE_COST)
    return { ok: false, reason: 'yetersiz_bakiye', need: CONFIG.PRESTIGE_COST };
  await removeHuntBalance(client, userId, CONFIG.PRESTIGE_COST);
  const tasks = await getAllTasks(client);
  for (const t of tasks.filter((x) => x.userId === userId)) {
    await removeTask(client, t.id);
    if (schedulerState.timeouts.has(t.id)) {
      clearTimeout(schedulerState.timeouts.get(t.id));
      schedulerState.timeouts.delete(t.id);
    }
  }
  await dbSet(client, `hunt_locked_${userId}`, true);
  const p = await getPrestige(client, userId);
  p.level = Number(p.level || 0) + 1;
  p.multiplier = Number(p.multiplier || 1) + 0.05;
  await dbSet(client, `hunt_prestige_${userId}`, p);
  await dbSet(client, `cooldownTime_${userId}`, 1);
  await dbSet(client, `amountUpgrade_${userId}`, 1);
  await dbSet(client, `qualityUpgrade_${userId}`, 1);
  await dbSet(client, `costUpgrade_${userId}`, 1);
  await dbSet(client, `hunt_mult_${userId}`, 1);
  await clearPendingPayment(client, 'cooldownTime', userId);
  await clearPendingPayment(client, 'amountUpgrade', userId);
  await clearPendingPayment(client, 'qualityUpgrade', userId);
  await clearPendingPayment(client, 'costUpgrade', userId);
  return { ok: true, prestige: p };
}

function upgradeCostForLevel(level) {
  return Math.floor(level * CONFIG.UPGRADE_BASE_COST * 0.9);
}
function computePassivePerHour(
  amountUpgradeLevel,
  qualityUpgradeLevel,
  cooldownTimeLevel
) {
  const base =
    (Number(amountUpgradeLevel || 0) +
      Number(qualityUpgradeLevel || 0) +
      Number(cooldownTimeLevel || 0)) *
    CONFIG.PASSIVE_INCOME_FACTOR *
    1000;
  return Math.max(0, Math.floor(base));
}

function scheduleTask(client, task) {
  try {
    const remaining = Number(task.end) - nowMs();
    if (remaining <= 0) {
      processHuntResult(client, task).catch((e) =>
        console.error('[huntbot] scheduleTask immediate error', e)
      );
      return;
    }
    if (remaining <= CONFIG.MAX_TIMEOUT) {
      const tid = setTimeout(() => {
        schedulerState.timeouts.delete(task.id);
        processHuntResult(client, task).catch((e) =>
          console.error('[huntbot] scheduleTask timeout error', e)
        );
      }, remaining);
      schedulerState.timeouts.set(task.id, tid);
    } else {
      const tid = setTimeout(() => {
        schedulerState.timeouts.delete(task.id);
        scheduleTask(client, task);
      }, CONFIG.MAX_TIMEOUT);
      schedulerState.timeouts.set(task.id, tid);
    }
  } catch (err) {
    console.error('[huntbot] scheduleTask error:', err);
  }
}

async function restoreHuntTasks(client) {
  const tasks = await getAllTasks(client);
  for (const task of tasks) {
    task.end = Number(task.end);
    task.start =
      Number(task.start) ||
      task.end - getCollectionTimeMs(task.cooldownTimeLevel || 1);
    scheduleTask(client, task);
  }
  setInterval(async () => {
    try {
      const all = await getAllTasks(client);
      const now = nowMs();
      for (const t of all) {
        if (Number(t.end) <= now) {
          if (schedulerState.timeouts.has(t.id)) continue;
          processHuntResult(client, t).catch((e) =>
            console.error('[huntbot] watchdog process error', e)
          );
        }
      }
    } catch (err) {
      console.error('[huntbot] restoreHuntTasks watchdog error', err);
    }
  }, CONFIG.WATCHDOG_INTERVAL_MS);
  console.log(`[huntbot] ${tasks.length} görev restore edildi.`);
}
exports.restoreHuntTasks = restoreHuntTasks;

async function tryApplyPendingUpgrades(client, userId) {
  const upgradeTypes = [
    'cooldownTime',
    'amountUpgrade',
    'qualityUpgrade',
    'costUpgrade',
  ];
  for (const type of upgradeTypes) {
    let pending = await getPendingPayment(client, type, userId);
    if (pending <= 0) continue;
    let current = (await dbGet(client, `${type}_${userId}`, 1)) || 1;
    while (pending > 0 && current < CONFIG.MAX_LEVEL) {
      const needed = upgradeCostForLevel(current);
      if (pending >= needed) {
        pending -= needed;
        current++;
      } else break;
    }
    await dbSet(client, `${type}_${userId}`, current);
    await dbSet(
      client,
      `pending_${type}_${userId}`,
      Math.max(0, Math.floor(pending))
    );
  }
}

async function processHuntResult(client, task) {
  if (!task || !task.id) return;
  if (schedulerState.timeouts.has(task.id))
    schedulerState.timeouts.delete(task.id);
  console.log(
    `[huntbot] processHuntResult for ${task.id} (user ${
      task.userId
    }) at ${new Date().toISOString()}`
  );
  try {
    await removeTask(client, task.id);
  } catch (err) {
    console.error('[huntbot] removeTask failed:', err);
  }

  const luck = Number(await getLuck(client, task.userId)) || 0;
  const luckChance = 1 + luck * CONFIG.LUCK_BASE;
  const collectable = getCollectableItems(task.qualityLevel || 1);
  const collected = [];
  for (let i = 0; i < (task.itemsCount || CONFIG.ITEMS_PER_LEVEL); i++) {
    if (!collectable.length) break;
    const useValuable = Math.random() < Math.min(0.5, 0.05 * luckChance);
    let pool =
      useValuable && valuableItems.length ? valuableItems : collectable;
    const rand = pool[Math.floor(Math.random() * pool.length)];
    if (rand) collected.push(rand);
  }

  const huntMult = Number(await getHuntMultiplier(client, task.userId)) || 1;
  const streakObj = await getStreak(client, task.userId);
  const streakBonus =
    Math.min(
      CONFIG.STREAK_BONUS_CAP,
      (Number(streakObj.count || 0) - 1) * CONFIG.STREAK_BONUS_PER
    ) || 0;
  const boostRecord = await dbGet(client, `hunt_boost_${task.userId}`, null);
  let boosterMultiplier = 1;
  if (
    boostRecord &&
    boostRecord.expiresAt &&
    Date.now() < Number(boostRecord.expiresAt)
  ) {
    boosterMultiplier = Number(boostRecord.multiplier) || 1;
    if (boostRecord.usesLeft) {
      boostRecord.usesLeft = Number(boostRecord.usesLeft) - 1;
      if (boostRecord.usesLeft <= 0) {
        await dbDelete(client, `hunt_boost_${task.userId}`).catch(() => {});
      } else {
        await dbSet(client, `hunt_boost_${task.userId}`, boostRecord);
      }
    }
  }

  let rawValue = 0;
  for (const it of collected) {
    let itemVal = Number(it.value || 0);
    const rarityBonus =
      it.rarity === 'rare' ? 0.2 : it.rarity === 'epic' ? 0.5 : 0;
    itemVal = Math.floor(itemVal * (1 + rarityBonus));
    rawValue += itemVal;
  }

  const finalMultiplier = huntMult * (1 + streakBonus) * boosterMultiplier;
  const adjustedRaw = Math.floor(rawValue * finalMultiplier);
  const converted = Math.floor(adjustedRaw * CONFIG.HUNT_COIN_CONVERSION_RATE);

  const autoSell = await dbGet(client, `hunt_autoSell_${task.userId}`, true);
  if (autoSell === false) {
    const inv = await getInventory(client, task.userId);
    await setInventory(client, task.userId, inv.concat(collected));
  } else {
    await addHuntBalance(client, task.userId, converted);
  }

  await bumpHuntMultiplier(
    client,
    task.userId,
    CONFIG.HUNT_MULTIPLIER_INCREMENT
  );
  await updateStreakOnHunt(client, task.userId);
  const totalHunts = (await dbGet(client, `hunt_total_${task.userId}`, 0)) || 0;
  await dbSet(client, `hunt_total_${task.userId}`, totalHunts + 1);

  await tryApplyPendingUpgrades(client, task.userId);

  try {
    const channel = await client.channels
      .fetch(task.channelId)
      .catch(() => null);
    const user = await client.users.fetch(task.userId).catch(() => null);
    const description = collected.length
      ? collected
          .map(
            (it) =>
              `${it.emoji || ''} ${it.name} (**${it.value}** ${chooseEmoji(
                it.value
              )})`
          )
          .join(', ')
      : `${emojis.bot.error} | Hiçbir eşya toplanamadı.`;
    const embed = new MessageEmbed()
      .setTitle(
        animeTitle(`${user ? user.tag : 'Kullanıcı'} - Toplanan Eşyalar`)
      )
      .setColor('DARK_NAVY')
      .setDescription(`🌸 ${description}`)
      .addField(
        '💱 Satış (huntcoin)',
        `**${converted}** ${chooseEmoji(converted)}`,
        true
      )
      .addField('🎚 Booster', `x${boosterMultiplier}`, true)
      .addField('🔁 HuntMultiplier', `x${huntMult.toFixed(2)}`, true)
      .setFooter({
        text: '🔧 hb menüsü: hb, hb eşyalar, hb sat, hb lider, hb autosell, hb booster <type>',
      })
      .setTimestamp();
    if (channel && channel.send) {
      await channel.send({ embeds: [embed] }).catch(async () => {
        if (user && user.send)
          await user.send({ embeds: [embed] }).catch(() => {});
      });
    } else if (user && user.send) {
      await user.send({ embeds: [embed] }).catch(() => {});
    }
  } catch (err) {
    console.error('[huntbot] send embed error:', err);
  }
}

async function sendPaginated(channel, title, color, itemsArray) {
  if (!Array.isArray(itemsArray)) itemsArray = [String(itemsArray)];
  const pages = [];
  let current = '';
  for (const line of itemsArray) {
    if ((current + '\n' + line).length > 1900) {
      pages.push(current);
      current = line;
    } else {
      current = current ? current + '\n' + line : line;
    }
  }
  if (current) pages.push(current);
  for (let i = 0; i < pages.length; i++) {
    const embed = new MessageEmbed()
      .setTitle(animeTitle(title))
      .setColor(color)
      .setDescription(pages[i])
      .setFooter({ text: `Sayfa ${i + 1}/${pages.length}` })
      .setTimestamp();
    await channel.send({ embeds: [embed] }).catch(() => {});
  }
}

exports.execute = async (client, message, args) => {
  const lockKey = message.author.id;
  if (schedulerState.userLocks.get(lockKey))
    return message.reply(
      `${emojis.bot.error} | İşleminiz sırada, lütfen kısa süre sonra tekrar deneyin.`
    );
  schedulerState.userLocks.set(lockKey, true);

  try {
    const user = message.author;
    const maxLevel = CONFIG.MAX_LEVEL;
    const cooldownTimeLevel =
      (await dbGet(client, `cooldownTime_${user.id}`, 1)) || 1;
    const amountUpgradeLevel =
      (await dbGet(client, `amountUpgrade_${user.id}`, 1)) || 1;
    const qualityUpgradeLevel =
      (await dbGet(client, `qualityUpgrade_${user.id}`, 1)) || 1;
    const costUpgradeLevel = Math.min(
      (await dbGet(client, `costUpgrade_${user.id}`, 1)) || 1,
      CONFIG.COST_UPGRADE_MAX
    );

    const gatheringCostPerMinute = Math.max(
      50 - 5 * (amountUpgradeLevel + costUpgradeLevel),
      10
    );
    const minCost = cooldownTimeLevel * 60 * gatheringCostPerMinute;
    const itemsCollected = CONFIG.ITEMS_PER_LEVEL * amountUpgradeLevel;
    const collectableItems = getCollectableItems(qualityUpgradeLevel);
    const collectionTime = getCollectionTimeMs(cooldownTimeLevel);
    const hours = Math.floor(collectionTime / (60 * 60 * 1000));
    const minutes = Math.floor(
      (collectionTime % (60 * 60 * 1000)) / (60 * 1000)
    );

    const tasks = await getAllTasks(client);
    let userTask = tasks.find((t) => t.userId === user.id);
    if (userTask && Number(userTask.end) <= nowMs()) {
      try {
        await processHuntResult(client, userTask);
      } catch (e) {
        console.error('[huntbot] execute immediate process error', e);
      }
      const after = await getAllTasks(client);
      userTask = after.find((t) => t.userId === user.id) || null;
      if (!userTask) {
        schedulerState.userLocks.set(lockKey, false);
        return message.reply(
          `${emojis.bot.succes} | Görev tamamlandı — sonuç gönderildi.`
        );
      }
    }

    const sub = (args[0] || '').toLowerCase();

    if (sub === 'test') {
      const pass = args[1] || '';
      if (pass !== SECRET_PASSWORD) {
        schedulerState.userLocks.set(lockKey, false);
        return message.reply(
          `${emojis.bot.error} | Test komutunu çalıştırmak için geçerli bir parola girin.`
        );
      }

      const action = (args[2] || '').toLowerCase();
      if (!action) {
        const report = [];
        try {
          await dbSet(client, `__hunt_test_${user.id}`, { ts: Date.now() });
          const read = await dbGet(client, `__hunt_test_${user.id}`, null);
          report.push(
            read && read.ts ? '✅ DB read/write OK' : '❌ DB read/write FAILED'
          );
          await dbDelete(client, `__hunt_test_${user.id}`);

          const before = await getHuntBalance(client, user.id);
          await addHuntBalance(client, user.id, 5);
          await removeHuntBalance(client, user.id, 5);
          const after = await getHuntBalance(client, user.id);
          report.push(
            before === after
              ? '✅ HuntCoin add/remove OK'
              : `⚠️ HuntCoin mismatch (before:${before} after:${after})`
          );

          const invKey = `__inv_test_${user.id}`;
          await dbSet(client, invKey, [
            { name: 'test-item', value: 1, emoji: '🔹' },
          ]);
          const inv = await dbGet(client, invKey, []);
          report.push(
            inv && inv.length === 1
              ? '✅ Inventory set/get OK'
              : '❌ Inventory set/get FAILED'
          );
          await dbDelete(client, invKey);

          const bKey = `hunt_boost_${user.id}`;
          await dbSet(client, bKey, {
            multiplier: 1.1,
            usesLeft: 1,
            expiresAt: Date.now() + 1000 * 10,
          });
          const b = await dbGet(client, bKey, null);
          report.push(
            b ? '✅ Booster set/get OK' : '❌ Booster set/get FAILED'
          );
          await dbDelete(client, bKey);

          await addPendingPayment(client, 'amountUpgrade', user.id, 10);
          const p = await getPendingPayment(client, 'amountUpgrade', user.id);
          report.push(
            p === 10
              ? '✅ Pending payment OK'
              : `❌ Pending payment mismatch (${p})`
          );
          await clearPendingPayment(client, 'amountUpgrade', user.id);

          const testTaskId = `${user.id}_test_${Date.now()}`;
          const testTask = {
            id: testTaskId,
            userId: user.id,
            channelId: message.channel.id,
            start: Date.now(),
            end: Date.now() + 5000,
            itemsCount: 1,
            qualityLevel: 1,
            cooldownTimeLevel: 1,
            amountSpent: 0,
            __test: true,
          };
          await addTask(client, testTask);
          scheduleTask(client, testTask);
          report.push(
            '⏳ Scheduler test task created (runs in ~5s). Check channel for result.'
          );

          const sampleList = items
            .concat(valuableItems)
            .map((it) => `${it.emoji || ''} ${it.name}`)
            .join(', ');
          if (sampleList.length > 1800)
            report.push(
              '⚠️ Eşya listesi çok büyük — embed açıklaması sınırına yaklaşabilir.'
            );
          else report.push('✅ Eşya listesi boyutu makul.');
        } catch (err) {
          console.error('[huntbot] test command error', err);
          report.push(`❌ Test hata: ${err.message || err}`);
        }

        const embed = new MessageEmbed()
          .setTitle(animeTitle('HuntBot Test Raporu'))
          .setColor('FUCHSIA')
          .setDescription(report.map((r) => `• ${r}`).join('\n'))
          .setFooter({
            text: 'Test tamamlandı — bazı testler (scheduler) asenkron sonuç veriyor.',
          })
          .setTimestamp();
        schedulerState.userLocks.set(lockKey, false);
        return message.channel.send({ embeds: [embed] });
      }

      if (action === 'reset' || action === 'sıfırla') {
        let target = message.mentions.users.first();
        if (!target && args[3]) {
          try {
            target = await client.users.fetch(args[3]);
          } catch (e) {}
        }
        const targetId = target ? target.id : user.id;
        const tasks = await getAllTasks(client);
        for (const t of tasks.filter((x) => x.userId === targetId)) {
          await removeTask(client, t.id);
          if (schedulerState.timeouts.has(t.id)) {
            clearTimeout(schedulerState.timeouts.get(t.id));
            schedulerState.timeouts.delete(t.id);
          }
        }
        const keys = [
          'huntbal_',
          'inventory_',
          'cooldownTime_',
          'amountUpgrade_',
          'qualityUpgrade_',
          'costUpgrade_',
          'hunt_mult_',
          'hunt_prestige_',
          'hunt_streak_',
          'hunt_total_',
          'hunt_boost_',
          'hunt_locked_',
        ];
        for (const k of keys) {
          await dbDelete(client, `${k}${targetId}`).catch(() => {});
        }
        await clearPendingPayment(client, 'cooldownTime', targetId);
        await clearPendingPayment(client, 'amountUpgrade', targetId);
        await clearPendingPayment(client, 'qualityUpgrade', targetId);
        await clearPendingPayment(client, 'costUpgrade', targetId);

        schedulerState.userLocks.set(lockKey, false);
        return message.reply(
          `${emojis.bot.succes} | Kullanıcının HuntBot verileri sıfırlandı: <@${targetId}>`
        );
      }

      if (action === 'ver' || action === 'give') {
        const target = message.mentions.users.first();
        if (!target) {
          schedulerState.userLocks.set(lockKey, false);
          return message.reply(
            `${emojis.bot.error} | Hedef kullanıcıyı etiketleyin.`
          );
        }
        const amt = Math.max(0, Math.floor(Number(args[3] || 0)));
        if (!amt) {
          schedulerState.userLocks.set(lockKey, false);
          return message.reply(
            `${emojis.bot.error} | Geçerli bir miktar girin.`
          );
        }
        await addHuntBalance(client, target.id, amt);
        schedulerState.userLocks.set(lockKey, false);
        return message.reply(
          `${emojis.bot.succes} | <@${target.id}> hesabına **${amt}** HuntCoin eklendi.`
        );
      }

      if (action === 'sil' || action === 'take') {
        const target = message.mentions.users.first();
        if (!target) {
          schedulerState.userLocks.set(lockKey, false);
          return message.reply(
            `${emojis.bot.error} | Hedef kullanıcıyı etiketleyin.`
          );
        }
        const amt = Math.max(0, Math.floor(Number(args[3] || 0)));
        if (!amt) {
          schedulerState.userLocks.set(lockKey, false);
          return message.reply(
            `${emojis.bot.error} | Geçerli bir miktar girin.`
          );
        }
        await removeHuntBalance(client, target.id, amt);
        schedulerState.userLocks.set(lockKey, false);
        return message.reply(
          `${emojis.bot.succes} | <@${target.id}> hesabından **${amt}** HuntCoin alındı.`
        );
      }

      schedulerState.userLocks.set(lockKey, false);
      return message.reply(
        `${emojis.bot.error} | Geçerli bir test alt komutu belirtin (reset/ver/sil).`
      );
    }

    const lockedNow = await dbGet(client, `hunt_locked_${user.id}`, false);
    if (lockedNow && args.length > 0 && !isNaN(args[0])) {
      schedulerState.userLocks.set(lockKey, false);
      return message.reply(
        `${emojis.bot.error} | HuntBot şu anda prestij nedeniyle kilitli. 'hb prestij-kaldir onay' ile kilidi kaldırabilirsiniz.`
      );
    }

    if (sub === 'eşyalar' || sub === 'esyalar') {
      const list = collectableItems.map(
        (item) =>
          `${item.emoji || ''} **${item.name}** - Değer: **${
            item.value
          }** ${chooseEmoji(item.value)}`
      );
      schedulerState.userLocks.set(lockKey, false);
      return sendPaginated(
        message.channel,
        'Toplanabilir Eşyalar',
        'BLUE',
        list
      );
    }

    if (sub === 'lider' || sub === 'liderlik') {
      const users = await dbGet(client, 'hunt_users', []);
      const pairs = [];
      for (const id of users)
        pairs.push({ id, bal: await getHuntBalance(client, id) });
      pairs.sort((a, b) => b.bal - a.bal);
      const top = pairs.slice(0, 10);
      const desc = top.length
        ? top
            .map(
              (p, i) =>
                `**${i + 1}.** <@${p.id}> — **${p.bal}** ${chooseEmoji(p.bal)}`
            )
            .join('\n')
        : 'Henüz kimse yok!';
      schedulerState.userLocks.set(lockKey, false);
      return message.channel.send({
        embeds: [
          new MessageEmbed()
            .setTitle(animeTitle('🏆 Hunt Leaderboard'))
            .setDescription(desc)
            .setColor('GOLD')
            .setTimestamp(),
        ],
      });
    }

    if (sub === 'bakiye' || sub === 'balance') {
      const bal = await getHuntBalance(client, user.id);
      schedulerState.userLocks.set(lockKey, false);
      return message.reply(
        `${emojis.bot.succes} | HuntCoin bakiyen: **${bal}** ${chooseEmoji(
          bal
        )}`
      );
    }

    if (sub === 'envanter' || sub === 'inv' || sub === 'inventory') {
      const inv = await getInventory(client, user.id);
      const list = inv.length
        ? inv.map(
            (it, i) =>
              `**${i + 1}.** ${it.emoji || ''} ${it.name} - ${it.value}`
          )
        : ['Envanter boş.'];
      schedulerState.userLocks.set(lockKey, false);
      return sendPaginated(message.channel, 'Envanteriniz', 'BLUE', list);
    }

    if (sub === 'sat' || sub === 'sell') {
      const inv = await getInventory(client, user.id);
      if (!inv.length) {
        schedulerState.userLocks.set(lockKey, false);
        return message.reply(`${emojis.bot.error} | Envanterin boş.`);
      }
      let total = 0;
      for (const it of inv) total += Number(it.value || 0);
      const conversion = Math.floor(total * CONFIG.HUNT_COIN_CONVERSION_RATE);
      const soldList = inv.map(
        (it, i) => `**${i + 1}.** ${it.emoji || ''} ${it.name} - ${it.value}`
      );
      await setInventory(client, user.id, []);
      await addHuntBalance(client, user.id, conversion);
      schedulerState.userLocks.set(lockKey, false);
      await sendPaginated(
        message.channel,
        'Satılan Eşyalar',
        'GREEN',
        soldList
      );
      return message.channel.send({
        embeds: [
          new MessageEmbed()
            .setTitle(animeTitle('Satış Özeti'))
            .setColor('GREEN')
            .setDescription(
              `Toplam: **${conversion}** ${chooseEmoji(conversion)}`
            )
            .setTimestamp(),
        ],
      });
    }

    if (sub === 'iptal' || sub === 'cancel') {
      if (!userTask) {
        schedulerState.userLocks.set(lockKey, false);
        return message.reply(`${emojis.bot.error} | Aktif bir görevin yok.`);
      }
      const now = nowMs();
      const totalTime = Math.max(
        1,
        Number(userTask.end) - Number(userTask.start) || 1
      );
      const remaining = Math.max(0, Number(userTask.end) - now);
      const refund = Math.floor(
        (Number(userTask.amountSpent || 0) * remaining) / totalTime
      );
      await removeTask(client, userTask.id);
      if (schedulerState.timeouts.has(userTask.id)) {
        clearTimeout(schedulerState.timeouts.get(userTask.id));
        schedulerState.timeouts.delete(userTask.id);
      }
      try {
        await client.eco.addMoney(user.id, refund).catch(() => {});
      } catch (e) {
        console.error('[huntbot] refund eco error', e);
      }
      schedulerState.userLocks.set(lockKey, false);
      return message.reply(
        `${emojis.bot.succes} | Görev iptal edildi. **${refund}** geri ödendi.`
      );
    }

    if (sub === 'booster' || sub === 'boost') {
      const type = (args[1] || '').toLowerCase();
      if (!type) {
        const desc = Object.entries(CONFIG.BOOSTERS)
          .map(
            ([k, v]) =>
              `**${k}** — Maliyet: ${v.cost}, x${
                v.multiplier
              }, süresi: ${Math.floor(v.durationMs / (60 * 60 * 1000))}saat`
          )
          .join('\n');
        schedulerState.userLocks.set(lockKey, false);
        return message.channel.send({
          embeds: [
            new MessageEmbed()
              .setTitle(animeTitle('Booster Mağazası'))
              .setDescription(desc)
              .setColor('BLUE')
              .setTimestamp(),
          ],
        });
      }
      const booster = CONFIG.BOOSTERS[type];
      if (!booster) {
        schedulerState.userLocks.set(lockKey, false);
        return message.reply(
          `${emojis.bot.error} | Geçersiz booster türü. (small|medium|large)`
        );
      }
      const bal = await getHuntBalance(client, user.id);
      if (bal < booster.cost) {
        schedulerState.userLocks.set(lockKey, false);
        return message.reply(
          `${emojis.bot.error} | Yeterli huntcoin yok. Gerekli: ${booster.cost}`
        );
      }
      await removeHuntBalance(client, user.id, booster.cost);
      const rec = {
        multiplier: booster.multiplier,
        usesLeft: booster.uses,
        expiresAt: Date.now() + booster.durationMs,
      };
      await dbSet(client, `hunt_boost_${user.id}`, rec);
      await bumpHuntMultiplier(client, user.id, 0.05);
      schedulerState.userLocks.set(lockKey, false);
      return message.reply(
        `${emojis.bot.succes} | Booster satın alındı: x${
          booster.multiplier
        } — ${booster.uses} kullanım, ${Math.floor(
          booster.durationMs / (60 * 60 * 1000)
        )} saat geçerli. Ayrıca kalıcı küçük bir HuntMultiplier artışı verildi.`
      );
    }

    if (sub === 'autosell' || sub === 'auto-sell') {
      const cur = await dbGet(client, `hunt_autoSell_${user.id}`, true);
      const next = cur === false ? true : false;
      await dbSet(client, `hunt_autoSell_${user.id}`, next);
      schedulerState.userLocks.set(lockKey, false);
      return message.reply(
        `${emojis.bot.succes} | Auto-sell ${next ? 'ETKİN' : 'DEVRE DIŞI'}.`
      );
    }

    if (sub === 'auto-upgrade' || sub === 'autoupgrade') {
      const cur = await getAutoUpgrade(client, user.id);
      await setAutoUpgrade(client, user.id, !cur);
      schedulerState.userLocks.set(lockKey, false);
      return message.reply(
        `${emojis.bot.succes} | Auto-upgrade ${!cur ? 'ETKİN' : 'DEVRE DIŞI'}.`
      );
    }

    if (sub === 'prestij' || sub === 'prestige') {
      const confirm = (args[1] || '').toLowerCase();
      if (confirm !== 'onay' && confirm !== 'confirm') {
        schedulerState.userLocks.set(lockKey, false);
        return message.reply(
          `${emojis.bot.error} | Prestij atmak için 'hb prestij onay' yazın. (Ücret: **${CONFIG.PRESTIGE_COST}** HuntCoin) — işlem aktif olduğunda tüm yükseltmeler sıfırlanır ve HuntBot kilitlenir.`
        );
      }
      const attempt = await attemptPrestige(client, user.id);
      schedulerState.userLocks.set(lockKey, false);
      if (!attempt.ok)
        return message.reply(
          `${emojis.bot.error} | Yeterli HuntCoin yok. Gerekli: **${attempt.need}**.`
        );
      return message.reply(
        `${emojis.bot.succes} | Prestij başarıyla uygulandı! Yeni prestij: Lv${
          attempt.prestige.level
        } (x${attempt.prestige.multiplier.toFixed(
          2
        )}). HuntBot artık kilitli — kaldırmak için 'hb prestij-kaldir onay' kullanın.`
      );
    }

    if (sub === 'prestij-kaldir' || sub === 'prestige-unlock') {
      const locked = await dbGet(client, `hunt_locked_${user.id}`, false);
      if (!locked) {
        schedulerState.userLocks.set(lockKey, false);
        return message.reply(`${emojis.bot.error} | Zaten kilitli değil.`);
      }
      const confirm = (args[1] || '').toLowerCase();
      if (confirm !== 'onay' && confirm !== 'confirm') {
        schedulerState.userLocks.set(lockKey, false);
        return message.reply(
          `${emojis.bot.error} | Kilidi kaldırmak için 'hb prestij-kaldir onay' yazın.`
        );
      }
      await dbSet(client, `hunt_locked_${user.id}`, false);
      schedulerState.userLocks.set(lockKey, false);
      return message.reply(
        `${emojis.bot.succes} | HuntBot kilidi kaldırıldı — artık yeni görev başlatabilirsiniz.`
      );
    }

    if (args.length === 2 && isNaN(args[0])) {
      const map = {
        süre: 'cooldownTime',
        miktar: 'amountUpgrade',
        kalite: 'qualityUpgrade',
        maliyet: 'costUpgrade',
      };
      const type = map[args[0].toLowerCase()];
      const val = Number(args[1]);
      if (!type || isNaN(val) || val <= 0) {
        schedulerState.userLocks.set(lockKey, false);
        return message.reply(
          `${emojis.bot.error} | Hatalı kullanım. Türler: süre, miktar, kalite, maliyet`
        );
      }

      if (val <= 20) {
        let current = (await dbGet(client, `${type}_${user.id}`, 1)) || 1;
        let pending = await getPendingPayment(client, type, user.id);
        let bal = await getHuntBalance(client, user.id);
        let levelsBought = 0;
        for (let i = 0; i < val; i++) {
          const needed = upgradeCostForLevel(current);
          const available = pending + bal;
          if (available >= needed && current < CONFIG.MAX_LEVEL) {
            const useFromPending = Math.min(pending, needed);
            pending -= useFromPending;
            let remainingNeeded = needed - useFromPending;
            if (remainingNeeded > 0) {
              bal = Math.max(0, bal - remainingNeeded);
            }
            current++;
            levelsBought++;
          } else break;
        }
        await dbSet(client, `${type}_${user.id}`, current);
        await dbSet(
          client,
          `pending_${type}_${user.id}`,
          Math.max(0, Math.floor(pending))
        );
        await dbSet(client, `huntbal_${user.id}`, Math.max(0, Math.floor(bal)));
        schedulerState.userLocks.set(lockKey, false);
        if (levelsBought > 0) {
          return message.reply(
            `${emojis.bot.succes} | Başarıyla **${levelsBought}** seviye satın alındı. Yeni seviye: **${current}**.`
          );
        } else {
          return message.reply(
            `${emojis.bot.error} | Yeterli fon yok. Mevcut pending: **${pending}**, HuntCoin: **${bal}**.`
          );
        }
      }

      const depositAmount = Math.floor(val);
      const balNow = await getHuntBalance(client, user.id);
      if (balNow < depositAmount) {
        schedulerState.userLocks.set(lockKey, false);
        return message.reply(
          `${emojis.bot.error} | Yeterli huntcoin yok. Mevcut: **${balNow}**.`
        );
      }
      await removeHuntBalance(client, user.id, depositAmount);
      await addPendingPayment(client, type, user.id, depositAmount);

      let current = (await dbGet(client, `${type}_${user.id}`, 1)) || 1;
      let applied = 0;
      let pendingNow = await getPendingPayment(client, type, user.id);
      while (pendingNow > 0 && current < CONFIG.MAX_LEVEL) {
        const needed = upgradeCostForLevel(current);
        if (pendingNow >= needed) {
          pendingNow -= needed;
          current++;
          applied++;
        } else break;
      }
      await dbSet(client, `${type}_${user.id}`, current);
      await dbSet(
        client,
        `pending_${type}_${user.id}`,
        Math.max(0, Math.floor(pendingNow))
      );

      const stillPending = await getPendingPayment(client, type, user.id);
      schedulerState.userLocks.set(lockKey, false);
      if (applied > 0)
        return message.reply(
          `${emojis.bot.succes} | Otomatik olarak **${applied}** seviye alındı. Kalan pending: **${stillPending}**. Yeni seviye: **${current}**.`
        );
      return message.reply(
        `${emojis.bot.succes} | **${depositAmount}** yatırıldı. Toplam ödenen (pending) bu özellik için: **${stillPending}**.`
      );
    }

    if (args.length > 0 && !isNaN(args[0])) {
      const amountToSpend = parseInt(args[0], 10);
      if (userTask) {
        schedulerState.userLocks.set(lockKey, false);
        return message.reply(
          `${emojis.bot.error} | Zaten aktif bir HuntBot görevin var — üst üste başlatılamaz.`
        );
      }
      if (amountToSpend < minCost) {
        schedulerState.userLocks.set(lockKey, false);
        return message.reply(
          `${emojis.bot.error} | **${
            message.member.displayName
          }**, en az **${minCost}** ${chooseEmoji(minCost)} harcaman gerekiyor~`
        );
      }
      const userBalance = (await client.eco.fetchMoney(user.id)).amount;
      if (userBalance < amountToSpend) {
        schedulerState.userLocks.set(lockKey, false);
        return message.reply(
          `${emojis.bot.error} | **${
            message.member.displayName
          }**, cüzdanın boş. Mevcut: **${userBalance}** ${chooseEmoji(
            userBalance
          )}`
        );
      }
      await client.eco.removeMoney(user.id, amountToSpend);
      const startTime = nowMs();
      const endTime = startTime + collectionTime;
      const task = {
        id: `${user.id}_${Date.now()}`,
        userId: user.id,
        channelId: message.channel.id,
        start: startTime,
        end: endTime,
        itemsCount: itemsCollected,
        qualityLevel: qualityUpgradeLevel,
        cooldownTimeLevel: cooldownTimeLevel,
        amountSpent: amountToSpend,
      };
      await addTask(client, task);
      scheduleTask(client, task);
      schedulerState.userLocks.set(lockKey, false);
      return message.reply(
        `${emojis.bot.succes} | ⏳ **HuntBot ${amountToSpend} ${chooseEmoji(
          amountToSpend
        )}** çalıştırıldı! Toplama süresi: **${hours} saat ${minutes} dakika** — görev başlatıldı.`
      );
    }

    const embed = new MessageEmbed()
      .setColor('GOLD')
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .setTimestamp();
    const huntBal = await getHuntBalance(client, user.id);
    const huntMult = await getHuntMultiplier(client, user.id);
    const passive = computePassivePerHour(
      amountUpgradeLevel,
      qualityUpgradeLevel,
      cooldownTimeLevel
    );

    const features = [
      { key: 'süre', field: 'cooldownTime', level: cooldownTimeLevel },
      { key: 'miktar', field: 'amountUpgrade', level: amountUpgradeLevel },
      { key: 'kalite', field: 'qualityUpgrade', level: qualityUpgradeLevel },
      { key: 'maliyet', field: 'costUpgrade', level: costUpgradeLevel },
    ];

    const featureLines = [];
    for (const f of features) {
      const nextLevel = Math.min(CONFIG.MAX_LEVEL, f.level + 1);
      const needed = upgradeCostForLevel(f.level);
      const pending = await getPendingPayment(client, f.field, user.id);
      featureLines.push(
        `**${f.key}** — Seviye: **${f.level} → ${nextLevel}**\n[Ödenen: **${pending}**] — Gerekli: **${needed}**`
      );
    }

    const exampleCoin = 1000;
    const minutesRuntimeForExample = Math.floor(
      exampleCoin / gatheringCostPerMinute
    );
    const hoursEx = Math.floor(minutesRuntimeForExample / 60);
    const minutesEx = minutesRuntimeForExample % 60;

    embed.setTitle(animeTitle(`${user.tag} — Hunt Durumu`));
    embed.setDescription(
      `${animeLine()} ${emojis.bot.succes} HuntBot durumu ve özet bilgiler`
    );
    embed.addFields(
      {
        name: '💸 HuntCoin',
        value: `**${huntBal}** ${chooseEmoji(huntBal)}`,
        inline: true,
      },
      {
        name: '🔁 HuntMultiplier',
        value: `x${huntMult.toFixed(2)}`,
        inline: true,
      },
      {
        name: '📈 Passive / Saat',
        value: `**${passive}** HuntCoin/saat`,
        inline: true,
      },
      {
        name: '⏳ Run süresi (tek görev)',
        value: `**${hours} saat ${minutes} dakika**`,
        inline: true,
      },
      {
        name: '🎯 Eşyalar (tek görev)',
        value: `**${itemsCollected}** adet`,
        inline: true,
      },
      {
        name: '💰 Maliyet / dk',
        value: `**${gatheringCostPerMinute}** ${chooseEmoji(
          gatheringCostPerMinute
        )} / dk`,
        inline: true,
      },
      {
        name: '🔎 Örnek',
        value: `**${exampleCoin}** coin => **${hoursEx} saat ${minutesEx} dakika** çalışma süresi (≈ ${minutesRuntimeForExample} dakika)`,
        inline: false,
      },
      {
        name: '⚙️ Özellikler (ödenen / gerekli)',
        value: featureLines.join('\n'),
        inline: false,
      }
    );
    embed.setFooter({
      text: '🔧 Geliştirmeler: hb <süre|miktar|kalite|maliyet> <miktar> (<=20 seviye, >20 huntcoin yatırma). hb eşyalar, hb sat, hb envanter, hb test <secret>.',
    });

    schedulerState.userLocks.set(lockKey, false);
    return message.channel.send({ embeds: [embed] });
  } catch (error) {
    console.error('[huntbot] execute error:', error);
    schedulerState.userLocks.set(lockKey, false);
    return message.reply(
      `${emojis.bot.error} | Bir hata oluştu. Lütfen daha sonra tekrar deneyin.`
    );
  }
};

exports.help = {
  name: 'huntbot',
  aliases: ['hb'],
  usage:
    'hb [miktar] | hb <özellik> <miktar> | hb eşyalar | hb sat | hb iptal | hb booster <tip> | hb lider | hb autosell | hb auto-upgrade | hb envanter | hb bakiye | hb prestij onay | hb test <secret> [reset/ver/sil]',
  description: `Gelişmiş HuntBot sistemi:
• Görev başlat / iptal
• Yükseltme & prestij
• Envanter & satış
• Booster / autosell / auto-upgrade
• Liderlik & test komutları`,
  category: 'Ekonomi',
  cooldown: 5,
};
