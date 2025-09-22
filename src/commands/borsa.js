const { MessageEmbed } = require('discord.js');
const emojis = require('../emoji.json');

const CONFIG = {
  FUNDS_KEY: 'borsa_funds_v1',
  SHARES_PREFIX: 'borsa_shares_',
  MONEY_PREFIX: 'money_',
  FUND_CREATE_COST: 5000000,
  TICK_INTERVAL_MS: 5 * 60 * 1000,
  TICK_MAX_MOVE: 0.12
};
function chooseEmoji(amount) {
  if (amount > 100000) return emojis.money.high;
  if (amount > 10000) return emojis.money.medium;
  return emojis.money.low;
}

function parsePercentToken(token) {
  if (!token) return null;
  const t = String(token).replace(',', '.').trim();
  const m = t.match(/-?[\d.]+/);
  if (!m) return null;
  const num = Number(m[0]);
  if (!isFinite(num)) return null;
  return Math.max(0, Math.min(100, num));
}

let marketTickerStarted = false;
let tickingLock = false;
let tickerHandle = null;

module.exports.help = {
  name: 'borsa',
  aliases: ['borsalar', 'borsa-v1'],
  usage: 'borsa <fon|hisse|tick> <altkomut> [args]',
  description: 'Fon yönetimi, hisse al/sat, haberler, tick başlatma',
  category: 'Ekonomi',
  cooldown: 3
};

module.exports.execute = async (client, message, args = []) => {
  if (!client.db) return message.reply(emojis.bot.error + ' | bi hhata oluşt~ :c client.db bulunamadı.');
  const db = client.db;
  const main = (args[0] || '').toLowerCase();

  try {
    if (['fon', 'fund'].includes(main)) return await handleFund();
    if (['hisse', 'share', 'shares'].includes(main)) return await handleShare();
    if (['tick', 'başlat', 'baslat'].includes(main)) return await handleTick();
    return await sendHelp();
  } catch (err) {
    console.error('borsa command error', err);
    return message.reply(emojis.bot.error + ' | bi hhata oluşt~ :c Konsolda detay var, geliştirici bakmalı.');
  }

  async function sendHelp() {
    const embed = new MessageEmbed()
      .setTitle('Borsa Komutları')
      .setDescription('fon oluştur/sat/işlem  / hisse list/al/sat/haberler / tick')
      .addField('Örnekler', 'borsa fon oluştur FONADI\nborsa fon sat FONADI\nborsa fon işlem FONADI Mesaj ; %50 ; koy\nborsa hisse list\nborsa hisse al FONADI %50\nborsa hisse sat FONADI %10\nborsa hisse haberler FONADI\nborsa tick')
      .setColor('#06b6d4');
    return message.channel.send({ embeds: [embed] });
  }

  async function getAllFunds() {
    return (await db.get(CONFIG.FUNDS_KEY)) || {};
  }

  async function saveAllFunds(obj) {
    await db.set(CONFIG.FUNDS_KEY, obj);
  }

  async function getFund(sym) {
    if (!sym) return null;
    const funds = await getAllFunds();
    return funds[sym.toUpperCase()] || null;
  }

  async function saveFund(sym, fund) {
    const funds = await getAllFunds();
    funds[sym.toUpperCase()] = fund;
    await saveAllFunds(funds);
  }

  async function deleteFund(sym) {
    const funds = await getAllFunds();
    delete funds[sym.toUpperCase()];
    await saveAllFunds(funds);
  }

  async function ensureUserMoney(userId) {
    if (client.eco && typeof client.eco.fetchMoney === 'function') {
      const m = await client.eco.fetchMoney(userId);
      return Number(m) || 0;
    }
    const key = CONFIG.MONEY_PREFIX + userId;
    const val = await db.get(key);
    if (val === null || typeof val === 'undefined') {
      await db.set(key, 0);
      return 0;
    }
    return Number(val) || 0;
  }

  async function addMoney(userId, amount) {
    const amt = Number(amount) || 0;
    if (client.eco && typeof client.eco.addMoney === 'function') return await client.eco.addMoney(userId, amt);
    const key = CONFIG.MONEY_PREFIX + userId;
    const val = Number((await db.get(key)) || 0) + amt;
    await db.set(key, val);
    return val;
  }

  async function subMoney(userId, amount) {
    const amt = Number(amount) || 0;
    if (client.eco && typeof client.eco.removeMoney === 'function') return await client.eco.removeMoney(userId, amt);
    const key = CONFIG.MONEY_PREFIX + userId;
    const val = Math.max(0, Number((await db.get(key)) || 0) - amt);
    await db.set(key, val);
    return val;
  }

  async function getShares(fundSym) {
    return (await db.get(CONFIG.SHARES_PREFIX + fundSym.toUpperCase())) || {};
  }

  async function saveShares(fundSym, obj) {
    await db.set(CONFIG.SHARES_PREFIX + fundSym.toUpperCase(), obj);
  }

  async function handleFund() {
    const action = (args[1] || '').toLowerCase();
    if (['oluştur', 'olustur', 'create'].includes(action)) return await fundCreate();
    if (['sat', 'sell'].includes(action)) return await fundSell();
    if (['işlem', 'islem', 'operation'].includes(action)) return await fundOperation();
    return message.reply(emojis.bot.error + ' | Kullanım: borsa fon <oluştur|sat|işlem>');
  }

  async function fundCreate() {
    const fundName = (args[2] || '').toUpperCase();
    if (!fundName || !/^[A-Z0-9]{2,12}$/.test(fundName)) return message.reply(emojis.bot.error + ' | bi hhata oluşt~ :c Sembol 2-12 büyük harf/numara olmalı.');
    const existing = await getFund(fundName);
    if (existing) return message.reply(emojis.bot.error + ' | Bu fon zaten var.');
    const balance = await ensureUserMoney(message.author.id);
    if (balance < CONFIG.FUND_CREATE_COST) return message.reply(emojis.bot.error + ' | Fon oluşturmak için ₺' + CONFIG.FUND_CREATE_COST + ' gerekli. Şu anki bakiyen: ₺' + shortNum(balance));
    await subMoney(message.author.id, CONFIG.FUND_CREATE_COST);
    const fund = {
      symbol: fundName,
      name: fundName + ' Fon',
      manager: message.author.id,
      managerTag: message.author.tag,
      value: Number(CONFIG.FUND_CREATE_COST),
      createdAt: Date.now(),
      soldPercentAbsolute: 0,
      salePoolAbsoluteMax: 49,
      news: [],
      variable: { active: false, percentAbsolute: 0, amount: 0 },
      metadata: {}
    };
    await saveFund(fundName, fund);
    await saveShares(fundName, {});
    return message.channel.send(emojis.bot.succes + ' | başarııı~ :3 Fon ' + fundName + ' oluşturuldu. Başlangıç değeri: ₺' + shortNum(fund.value));
  }

  async function fundSell() {
    const fundName = (args[2] || '').toUpperCase();
    if (!fundName) return message.reply(emojis.bot.error + ' | Kullanım: borsa fon sat <FONADI>');
    const fund = await getFund(fundName);
    if (!fund) return message.reply(emojis.bot.error + ' | Böyle bir fon yok.');
    if (fund.manager !== message.author.id && !(client.config && client.config.owners && client.config.owners.includes(message.author.id))) return message.reply(emojis.bot.error + ' | Bu fonun yöneticisi değilsin.');
    const shares = await getShares(fundName);
    const recipients = [];
    const totalProceeds = Number(fund.value) || 0;
    let distributed = 0;
    const shareEntries = Object.entries(shares);
    if (shareEntries.length === 0) {
      await addMoney(fund.manager, totalProceeds);
      await deleteFund(fundName);
      await db.delete(CONFIG.SHARES_PREFIX + fundName.toUpperCase());
      return message.channel.send(emojis.bot.succes + ' | başarııı~ :3 Fon satıldı. Hiç hisse sahibi yoktu. Tüm tutar yöneticinin hesabına eklendi: ₺' + shortNum(totalProceeds));
    }
    for (const [userId, pct] of shareEntries) {
      const perc = Number(pct) || 0;
      const amount = (totalProceeds * (perc / 100));
      distributed += amount;
      recipients.push({ id: userId, percent: perc, amount: amount });
    }
    const managerShare = Math.max(0, totalProceeds - distributed);
    const lines = [];
    for (const r of recipients) {
      await addMoney(r.id, r.amount);
      lines.push(r.id + ' → ₺' + shortNum(r.amount) + ' (' + r.percent.toFixed(4) + '%)');
    }
    if (managerShare > 0) {
      await addMoney(fund.manager, managerShare);
      lines.push(fund.managerTag + ' (yönetici) → ₺' + shortNum(managerShare));
    }
    await deleteFund(fundName);
    await db.delete(CONFIG.SHARES_PREFIX + fundName.toUpperCase());
    const embed = new MessageEmbed()
      .setTitle('Fon Satışı Detayları — ' + fundName)
      .setDescription(lines.join('\n'))
      .addField('Toplam', '₺' + shortNum(totalProceeds), true)
      .setColor('#34d399');
    return message.channel.send({ embeds: [embed] });
  }

  async function fundOperation() {
    const fundName = (args[2] || '').toUpperCase();
    if (!fundName) return message.reply(emojis.bot.error + ' | Kullanım: borsa fon işlem <FONADI> Mesaj ; %50 ; <koy|çek>');
    const fund = await getFund(fundName);
    if (!fund) return message.reply(emojis.bot.error + ' | Böyle bir fon yok.');
    const rest = args.slice(3).join(' ').trim();
    if (!rest) return message.reply(emojis.bot.error + ' | İşlem için mesaj ; %X ; işlem türü yazmalısın.');
    const parts = rest.split(';').map(p => p.trim()).filter(Boolean);
    const newsText = parts[0] || '';
    let percentToken = parts[1] || null;
    let actionToken = parts[2] || null;
    if (newsText) {
      fund.news = fund.news || [];
      fund.news.unshift({ t: Date.now(), txt: newsText });
      if (fund.news.length > 20) fund.news.pop();
    }
    if (percentToken) {
      const pct = parsePercentToken(percentToken);
      if (pct === null) return message.reply(emojis.bot.error + ' | Yüzde bilgisi hatalı. Örn: %50 veya 50');
      if (!actionToken) return message.reply(emojis.bot.error + ' | Lütfen değişken için işlem türü yaz: koy veya çek');
      const action = actionToken.toLowerCase();
      if (['koy', 'koyu', 'koyulacak', 'put'].includes(action)) {
        const amount = fund.value * (pct / 100);
        fund.variable = { active: true, percentAbsolute: pct, amount: amount };
        await saveFund(fundName, fund);
        return message.channel.send(emojis.bot.succes + ' | başarııı~ :3 Değişkene ₺' + shortNum(amount) + ' (%' + pct + ') kondu. Haber eklendi.');
      }
      if (['çek', 'cek', 'withdraw'].includes(action)) {
        if (!fund.variable || !fund.variable.active) return message.reply(emojis.bot.error + ' | Değişkende aktif bir tutar yok.');
        const withdrawPct = pct;
        const toWithdraw = fund.variable.amount * (withdrawPct / 100);
        fund.variable.amount = Math.max(0, fund.variable.amount - toWithdraw);
        if (fund.variable.amount <= 0) fund.variable.active = false;
        fund.value = Math.max(0, fund.value - toWithdraw);
        await saveFund(fundName, fund);
        await addMoney(fund.manager, toWithdraw);
        return message.channel.send(emojis.bot.succes + ' | başarııı~ :3 ₺' + shortNum(toWithdraw) + ' çekildi ve yöneticinin hesabına eklendi.');
      }
      return message.reply(emojis.bot.error + ' | İşlem türü geçersiz. koy veya çek yaz.');
    } else {
      await saveFund(fundName, fund);
      return message.channel.send(emojis.bot.succes + ' | Haber eklendi, teşekkürler! 🌸');
    }
  }

  async function handleShare() {
    const sub = (args[1] || '').toLowerCase();
    if (['list'].includes(sub) || (!sub && args[1] === undefined)) return await sharesList();
    if (['al', 'buy'].includes(sub)) return await sharesBuy();
    if (['sat', 'sell'].includes(sub)) return await sharesSell();
    if (['haberler', 'haber', 'news'].includes(sub)) return await sharesNews();
    return message.reply(emojis.bot.error + ' | Kullanım: borsa hisse <list|al|sat|haberler>');
  }

  async function sharesList() {
    const funds = await getAllFunds();
    const lines = [];
    for (const k of Object.keys(funds)) {
      const f = funds[k];
      const varActive = f.variable && f.variable.active ? ' (DEĞİŞKENDE)' : '';
      lines.push('**' + f.symbol + '** — ₺' + shortNum(f.value) + varActive + ' — Yönetici: ' + (f.managerTag || '—'));
    }
    if (lines.length === 0) return message.channel.send(emojis.bot.error + ' | Hiç fon yok şu an.');
    const embed = new MessageEmbed()
      .setTitle('Fon Listesi')
      .setDescription(lines.join('\n'))
      .setColor('#06b6d4');
    return message.channel.send({ embeds: [embed] });
  }

  async function sharesNews() {
    const fundName = (args[2] || '').toUpperCase();
    if (!fundName) return message.reply(emojis.bot.error + ' | Kullanım: borsa hisse haberler <FONADI>');
    const fund = await getFund(fundName);
    if (!fund) return message.reply(emojis.bot.error + ' | Böyle bir fon yok.');
    const news = (fund.news || []).slice(0, 10).map(n => '• ' + new Date(n.t).toLocaleString('tr-TR') + ' — ' + n.txt);
    if (news.length === 0) return message.channel.send(emojis.bot.error + ' | Bu fonun henüz haberi yok.');
    const embed = new MessageEmbed()
      .setTitle('Haberler — ' + fundName)
      .setDescription(news.join('\n'))
      .setColor('#a78bfa');
    return message.channel.send({ embeds: [embed] });
  }

  async function sharesBuy() {
    const fundName = (args[2] || '').toUpperCase();
    const pctToken = args[3] || '';
    if (!fundName || !pctToken) return message.reply(emojis.bot.error + ' | Kullanım: borsa hisse al <FONADI> %? (örn %100 = kalan poolu al)');
    const fund = await getFund(fundName);
    if (!fund) return message.reply(emojis.bot.error + ' | Böyle bir fon yok.');
    const pct = parsePercentToken(pctToken);
    if (pct === null) return message.reply(emojis.bot.error + ' | Yüzde bilgisi hatalı.');
    const shares = await getShares(fundName);
    const sold = Number(fund.soldPercentAbsolute) || 0;
    const poolMax = Number(fund.salePoolAbsoluteMax) || 49;
    const available = Math.max(0, poolMax - sold);
    if (available <= 0) return message.channel.send(emojis.bot.error + ' | Bu fonun satışa açık kısmı dolmuş.');
    const wantedAbsolute = (available * (pct / 100));
    const finalAbsolute = Math.min(available, wantedAbsolute);
    if (finalAbsolute <= 0) return message.channel.send(emojis.bot.error + ' | Alınacak hisse yok.');
    const cost = (fund.value * (finalAbsolute / 100));
    const userMoney = await ensureUserMoney(message.author.id);
    if (userMoney < cost) return message.reply(emojis.bot.error + ' | Yetersiz bakiye. Gerekli: ₺' + shortNum(cost) + ' Senin: ₺' + shortNum(userMoney));
    shares[message.author.id] = (Number(shares[message.author.id]) || 0) + finalAbsolute;
    fund.soldPercentAbsolute = +(Number(fund.soldPercentAbsolute) + finalAbsolute).toFixed(8);
    await saveShares(fundName, shares);
    await saveFund(fundName, fund);
    await subMoney(message.author.id, cost);
    return message.channel.send(emojis.bot.succes + ' | başarııı~ :3 ' + finalAbsolute.toFixed(6) + '% hisse alındı. Harcanan: ₺' + shortNum(cost) + '. Kalan pool: %' + (Math.max(0, poolMax - fund.soldPercentAbsolute)).toFixed(6));
  }

  async function sharesSell() {
    const fundName = (args[2] || '').toUpperCase();
    const pctToken = args[3] || '';
    if (!fundName || !pctToken) return message.reply(emojis.bot.error + ' | Kullanım: borsa hisse sat <FONADI> %?');
    const fund = await getFund(fundName);
    if (!fund) return message.reply(emojis.bot.error + ' | Böyle bir fon yok.');
    const pct = parsePercentToken(pctToken);
    if (pct === null) return message.reply(emojis.bot.error + ' | Yüzde bilgisi hatalı.');
    const shares = await getShares(fundName);
    const have = Number(shares[message.author.id] || 0);
    if (have <= 0) return message.channel.send(emojis.bot.error + ' | Bu fonda hisseye sahip değilsin.');
    const sellAbsolute = Math.min(have, (have * (pct / 100)));
    if (sellAbsolute <= 0) return message.channel.send(emojis.bot.error + ' | Satılacak hisse yok.');
    const gross = fund.value * (sellAbsolute / 100);
    const fee = gross * 0.02;
    const net = gross - fee;
    shares[message.author.id] = +(have - sellAbsolute).toFixed(8);
    if (shares[message.author.id] <= 0) delete shares[message.author.id];
    fund.soldPercentAbsolute = +(Number(fund.soldPercentAbsolute) - sellAbsolute).toFixed(8);
    await saveShares(fundName, shares);
    await saveFund(fundName, fund);
    await addMoney(message.author.id, net);
    await addMoney(fund.manager, fee);
    return message.channel.send(emojis.bot.succes + ' | başarııı~ :3 ' + sellAbsolute.toFixed(6) + '% hisse satıldı. Elde edilen (kesin): ₺' + shortNum(net) + ' (Kesinti ₺' + shortNum(fee) + ' yöneticisine gitti.)');
  }

async function handleTick() {
  const isBotOwner = (() => {
    const cfg = client.config || {};
    const ownerId = cfg.ownerId || cfg.owner || null;
    if (ownerId && String(ownerId) === String(message.author?.id)) return true;
    if (Array.isArray(cfg.owners) && cfg.owners.includes(message.author?.id)) return true;
    return false;
  })();
  const isManager = !!(message.member && message.member.permissions && message.member.permissions.has('MANAGE_GUILD'));
  if (!isBotOwner && !isManager) return message.reply(`${emojis.bot.error} | Yetkin yok.`);
  if (marketTickerStarted) return message.channel.send(`${emojis.bot.error} | Zaten piyasa 5 dakikada bir güncelleniyor.`);
  await tickImmediate();
  startTicker(client, db);
  return message.channel.send(`${emojis.bot.succes} | Piyasa zamanlayıcısı başlatıldı — her 5 dakikada bir güncellenecek.`);
}


  async function tickImmediate() {
    if (tickingLock) return message.channel.send(emojis.bot.error + ' | Piyasa zaten güncelleniyor, bekle lütfen.');
    tickingLock = true;
    try {
      const funds = await getAllFunds();
      for (const k of Object.keys(funds)) {
        const f = funds[k];
        if (f.variable && f.variable.active) {
          const noise = (Math.random() * CONFIG.TICK_MAX_MOVE * 2) - CONFIG.TICK_MAX_MOVE;
          const change = noise;
          const delta = f.variable.amount * change;
          f.variable.amount = Math.max(0, f.variable.amount + delta);
          const diff = delta;
          f.value = Math.max(0, f.value + diff);
          if (f.variable.amount <= 0.0001) f.variable.active = false;
        } else {
          const noise = (Math.random() * CONFIG.TICK_MAX_MOVE * 2) - CONFIG.TICK_MAX_MOVE;
          const deltaValue = f.value * noise * 0.01;
          f.value = Math.max(0, f.value + deltaValue);
        }
        funds[k] = f;
      }
      await saveAllFunds(funds);
      return message.channel.send(emojis.bot.succes + ' | Piyasa güncellendi, bi tık!');
    } catch (e) {
      console.error('tickImmediate error', e);
      return message.channel.send(emojis.bot.error + ' | bi hhata oluşt~ :c Piyasa güncellenemedi.');
    } finally {
      tickingLock = false;
    }
  }
};

function startTicker(client, db) {
  if (marketTickerStarted) return;
  marketTickerStarted = true;
  tickerHandle = setInterval(async () => {
    try {
      const funds = (await db.get(CONFIG.FUNDS_KEY)) || {};
      for (const k of Object.keys(funds)) {
        const f = funds[k];
        if (f.variable && f.variable.active) {
          const noise = (Math.random() * CONFIG.TICK_MAX_MOVE * 2) - CONFIG.TICK_MAX_MOVE;
          const change = noise;
          const delta = f.variable.amount * change;
          f.variable.amount = Math.max(0, f.variable.amount + delta);
          f.value = Math.max(0, f.value + delta);
          if (f.variable.amount <= 0.0001) f.variable.active = false;
        } else {
          const noise = (Math.random() * CONFIG.TICK_MAX_MOVE * 2) - CONFIG.TICK_MAX_MOVE;
          const deltaValue = f.value * noise * 0.01;
          f.value = Math.max(0, f.value + deltaValue);
        }
        funds[k] = f;
      }
      await db.set(CONFIG.FUNDS_KEY, funds);
    } catch (e) {
      console.error('scheduled tick error', e);
    }
  }, CONFIG.TICK_INTERVAL_MS);
}

function shortNum(n) {
  const num = Number(n) || 0;
  if (!isFinite(num)) return '0';
  if (Math.abs(num) >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (Math.abs(num) >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (Math.abs(num) >= 1e3) return (num / 1e3).toFixed(2) + 'K';
  return num.toFixed(2);
}
