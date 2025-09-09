const { MessageEmbed, MessageAttachment } = require('discord.js');
const Canvas = require('canvas');
const emojis = require('../emoji.json');

const CONFIG = {
  COINS_KEY: 'coins_v4',
  PORTFOLIO_PREFIX: 'pf_',
  MONEY_PREFIX: 'money_',
  HISTORY_LEN: 240,
  GRAPH: { width: 1000, height: 380 },
  CREATE_COST: 2_500_000,
  TICK_INTERVAL_MS: 5 * 60 * 1000,
  TICK_MAX_MOVE: 0.12,
  DEFAULT_COINS: [
    { symbol: 'BTC', name: 'Bitcoin', price: 60000, supply: 21000000 },
    { symbol: 'ETH', name: 'Ethereum', price: 3500, supply: 115000000 },
    { symbol: 'USDT', name: 'Tether', price: 1, supply: 5000000000 },
    { symbol: 'BNB', name: 'BNB', price: 400, supply: 170000000 },
    { symbol: 'ADA', name: 'Cardano', price: 1.2, supply: 32000000000 },
    { symbol: 'DOGE', name: 'Dogecoin', price: 0.25, supply: 140000000000 },
    { symbol: 'SOL', name: 'Solana', price: 150, supply: 550000000 },
    { symbol: 'XRP', name: 'XRP', price: 0.8, supply: 100000000000 },
  ],
};

function formatMoneyTR(n) {
  if (n === null || n === undefined) return '0';
  const num = Number(n);
  if (!isFinite(num)) return '0';
  return num.toLocaleString('tr-TR', { maximumFractionDigits: 8 });
}

function shortNum(n) {
  if (n === null || n === undefined) return '0';
  const num = Number(n);
  if (!isFinite(num)) return '0';
  if (Math.abs(num) >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
  if (Math.abs(num) >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
  if (Math.abs(num) >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
  return num.toFixed(2);
}

function percent(oldP, newP) {
  if (!oldP) return 0;
  return ((newP - oldP) / Math.abs(oldP)) * 100;
}

function stddev(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance =
    arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / arr.length;
  return Math.sqrt(variance);
}

function balanceEmojiFunc(balance) {
  let balanceEmoji = emojis.money.low;
  if (balance > 100000) balanceEmoji = emojis.money.high;
  else if (balance > 10000) balanceEmoji = emojis.money.medium;
  return balanceEmoji;
}

let marketTickerStarted = false;
let tickingLock = false;

module.exports.help = {
  name: 'coin',
  aliases: ['coins', 'market', 'co'],
  usage:
    'coin <yardım|liste|bilgi|yönet|al|sat|cüzdan|grafik|tavsiye|tick> [args]',
  description: 'Gelişmiş coin piyasası sistemi',
  category: 'Ekonomi',
  cooldown: 3,
};

module.exports.execute = async (client, message, args = []) => {
  if (!client.db)
    return message.reply(
      `${emojis.bot.error} | bi hhata oluşt~ :c client.db bulunamadı.`
    );
  const db = client.db;

  const sub = (args[0] || 'yardım').toLowerCase();
  try {
    if (['help', 'yardim', 'yardım'].includes(sub)) return sendHelp();
    if (['list', 'liste'].includes(sub)) return listCoins();
    if (['info', 'bilgi'].includes(sub)) return coinInfo();
    if (sub === 'yönet' || sub === 'yonet') {
      const action = (args[1] || '').toLowerCase();
      if (['oluştur', 'olustur', 'create'].includes(action))
        return createCoin();
      if (['sat'].includes(action)) return yönetSat();
      return message.reply(
        `${emojis.bot.error} | Kullanım: coin yönet <oluştur|sat>`
      );
    }
    if (['create', 'oluştur', 'olustur'].includes(sub)) return createCoin();
    if (['buy', 'al'].includes(sub)) return buyCoin();
    if (['sell', 'sat'].includes(sub)) return sellCoin();
    if (['cüzdan', 'cuzdan', 'wallet', 'portfolio'].includes(sub))
      return showPortfolio();
    if (['graph', 'grafik'].includes(sub)) return graphCoin();
    if (['recommend', 'tavsiye'].includes(sub)) return recommend();
    if (['tick', 'başlat', 'baslat'].includes(sub)) return tickMarket();
    return sendHelp();
  } catch (err) {
    console.error('coin command error', err);
    return message.reply(
      `${emojis.bot.error} | bi hhata oluşt~ :c Konsolda detay var, geliştirici bakmalı.`
    );
  }

  async function ensureSeededCoins() {
    const existing = (await db.get(CONFIG.COINS_KEY)) || {};
    if (Object.keys(existing).length === 0) {
      const seed = {};
      for (const c of CONFIG.DEFAULT_COINS) {
        const coin = {
          symbol: c.symbol,
          name: c.name,
          price: Number(c.price),
          supply: c.supply,
          creator: 'system',
          creatorTag: 'Default',
          history: [{ t: Date.now(), p: Number(c.price) }],
          createdAt: Date.now(),
          drift: 0,
          creatorRefunded: false,
        };
        seed[c.symbol] = coin;
      }
      await db.set(CONFIG.COINS_KEY, seed);
      return seed;
    }
    return existing;
  }

  async function getAllCoins() {
    const coins = (await db.get(CONFIG.COINS_KEY)) || {};
    return coins;
  }

  async function saveAllCoins(obj) {
    await db.set(CONFIG.COINS_KEY, obj);
  }

  async function getCoin(sym) {
    if (!sym) return null;
    const coins = await getAllCoins();
    return coins[sym.toUpperCase()] || null;
  }

  async function saveCoin(sym, coin) {
    const coins = await getAllCoins();
    coins[sym.toUpperCase()] = coin;
    await saveAllCoins(coins);
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
    if (!userId) return 0;
    const amt = Number(amount) || 0;
    if (client.eco && typeof client.eco.addMoney === 'function')
      return await client.eco.addMoney(userId, amt);
    const key = CONFIG.MONEY_PREFIX + userId;
    const val = Number((await db.get(key)) || 0) + amt;
    await db.set(key, val);
    return val;
  }

  async function subMoney(userId, amount) {
    if (!userId) return 0;
    const amt = Number(amount) || 0;
    if (client.eco && typeof client.eco.removeMoney === 'function')
      return await client.eco.removeMoney(userId, amt);
    const key = CONFIG.MONEY_PREFIX + userId;
    const val = Math.max(0, Number((await db.get(key)) || 0) - amt);
    await db.set(key, val);
    return val;
  }

  async function getPortfolio(userId) {
    return (await db.get(CONFIG.PORTFOLIO_PREFIX + userId)) || {};
  }

  async function savePortfolio(userId, obj) {
    await db.set(CONFIG.PORTFOLIO_PREFIX + userId, obj);
  }

  async function sendHelp() {
    const embed = new MessageEmbed()
      .setTitle('Coin Komutları')
      .setDescription(
        'yardım, liste, bilgi, yönet, al, sat, cüzdan, grafik, tavsiye, tick'
      )
      .addField(
        'Örnek',
        '`coin al BTC 0.023`  `coin sat BTC all`  `coin yönet oluştur ABC 0.5 1000000`'
      )
      .setColor('#22c55e');
    return message.channel.send({ embeds: [embed] });
  }

  async function listCoins() {
    const pageArg = Number(args[1]) || 1;
    const all = await ensureSeededCoins();
    const allKeys = Object.keys(all).sort();
    const defaultSymbols = CONFIG.DEFAULT_COINS.map((c) => c.symbol);
    const defaultCoins = defaultSymbols.map((s) => all[s]).filter(Boolean);
    const userCoins = allKeys
      .filter((k) => !defaultSymbols.includes(k))
      .map((k) => all[k]);

    const perPage = 5;
    let page = Math.max(1, pageArg);
    const pages =
      Math.ceil((defaultCoins.length + userCoins.length) / perPage) || 1;
    if (page > pages) page = pages;

    const start = (page - 1) * perPage;
    const items = defaultCoins.concat(userCoins).slice(start, start + perPage);

    if (items.length === 0)
      return message.channel.send(
        `${emojis.bot.error} | bi hhata oluşt~ :c Hiç coin yok...`
      );

    const lines = items.map((c) => {
      const hist = c.history || [];
      const prev = hist.length >= 2 ? hist[hist.length - 2].p : c.price;
      const up = c.price >= prev;
      const arrow = up ? '▲' : '▼';
      const color = up ? 'Yeşil' : 'Kırmızı';
      return `**${c.symbol}** — ${c.name} — ₺${shortNum(
        c.price
      )} — ${arrow} (${color}) — Oluşturan: ${c.creatorTag || '—'}`;
    });

    const embed = new MessageEmbed()
      .setTitle(`Coin Listesi — Sayfa ${page}/${pages}`)
      .setDescription(lines.join('\n'))

      .setColor('#06b6d4');

    return message.channel.send({ embeds: [embed] });
  }

  async function coinInfo() {
    const sym = (args[1] || '').toUpperCase();
    if (!sym)
      return message.reply(
        `${emojis.bot.error} | bi hhata oluşt~ :c Kullanım: coin bilgi <Sembol>`
      );
    const coin = await getCoin(sym);
    if (!coin)
      return message.reply(`${emojis.bot.error} | Böyle bir coin yok.`);
    const hist = coin.history || [];
    const prev = hist.length >= 2 ? hist[hist.length - 2].p : coin.price;
    const chg = percent(prev, coin.price).toFixed(2);
    const embed = new MessageEmbed()
      .setTitle(`${coin.name} (${coin.symbol})`)
      .addField('Fiyat', `₺${formatMoneyTR(coin.price)}`, true)
      .addField('Son değişim', `${chg}%`, true)
      .addField('Supply', `${shortNum(coin.supply)}`, true)
      .addField('Oluşturan', coin.creatorTag || '—', true)
      .setColor('#a78bfa');
    return message.channel.send({ embeds: [embed] });
  }

  async function createCoin() {
    const sym = (args[2] || args[1] || '').toUpperCase();
    const price = Number(args[3] || args[2]);
    const supply = Number(args[4] || args[3]) || 1_000_000;
    if (!sym || !/^[A-Z]{2,8}$/.test(sym))
      return message.reply(
        `${emojis.bot.error} | bi hhata oluşt~ :c Sembol 2-8 büyük harf olmalı. Örnek: ABC`
      );
    if (!price || price <= 0)
      return message.reply(
        `${emojis.bot.error} | Başlangıç fiyatı pozitif olmalı.`
      );
    const coins = await getAllCoins();
    if (coins[sym])
      return message.reply(`${emojis.bot.error} | Bu sembol zaten var.`);

    const money = await ensureUserMoney(message.author.id);
    if (money < CONFIG.CREATE_COST)
      return message.reply(
        `${emojis.bot.error} | Yeni coin oluşturmak için ₺${shortNum(
          CONFIG.CREATE_COST
        )} lazım. Paran: ₺${shortNum(money)}`
      );

    await subMoney(message.author.id, CONFIG.CREATE_COST);

    const coin = {
      symbol: sym,
      name: `${sym} Coin`,
      price: Number(price),
      supply: Math.max(1, Math.floor(supply)),
      creator: message.author.id,
      creatorTag: message.author.tag,
      history: [{ t: Date.now(), p: Number(price) }],
      createdAt: Date.now(),
      drift: 0,
      creatorRefunded: false,
    };

    await saveCoin(sym, coin);
    return message.channel.send(
      `${
        emojis.bot.succes
      } | başarııı~ :3 ${sym} oluşturuldu. Oluşturma ücreti: ₺${shortNum(
        CONFIG.CREATE_COST
      )} alındı.`
    );
  }

  async function yönetSat() {
    const coins = await getAllCoins();
    const created = Object.values(coins).filter(
      (c) => c.creator === message.author.id && !c.creatorRefunded
    );
    if (created.length === 0)
      return message.reply(
        `${emojis.bot.error} | bi hhata oluşt~ :c Satılacak oluşturduğun coin yok veya zaten iade edilmiş.`
      );
    let target = null;
    if (args[2]) {
      const sym = args[2].toUpperCase();
      target = created.find((c) => c.symbol === sym);
      if (!target)
        return message.reply(
          `${emojis.bot.error} | Belirtilen sembol için oluşturucu değilsin ya da coin bulunamadı.`
        );
    } else {
      created.sort((a, b) => b.createdAt - a.createdAt);
      target = created[0];
    }
    const coinsObj = await getAllCoins();
    delete coinsObj[target.symbol];
    await saveAllCoins(coinsObj);
    await addMoney(message.author.id, CONFIG.CREATE_COST);
    target.creatorRefunded = true;
    return message.channel.send(
      `${emojis.bot.succes} | başarııı~ :3 ${
        target.symbol
      } piyasadan kaldırıldı ve ₺${shortNum(CONFIG.CREATE_COST)} iade edildi.`
    );
  }

  async function buyCoin() {
    const sym = (args[1] || '').toUpperCase();
    const amountArg = args[2];
    if (!sym || !amountArg)
      return message.reply(
        `${emojis.bot.error} | bi hhata oluşt~ :c Kullanım: coin al <Sembol> <miktar|100$>`
      );
    const coin = await getCoin(sym);
    if (!coin)
      return message.reply(`${emojis.bot.error} | Böyle bir coin yok.`);

    let qty = 0;
    let cost = 0;
    if (String(amountArg).endsWith('$')) {
      const cash = Number(String(amountArg).slice(0, -1));
      if (!cash || cash <= 0)
        return message.reply(`${emojis.bot.error} | Pozitif bir miktar gir.`);
      cost = cash;
      qty = cost / coin.price;
    } else {
      qty = Number(amountArg);
      if (!qty || qty <= 0)
        return message.reply(`${emojis.bot.error} | Pozitif bir miktar gir.`);
      cost = qty * coin.price;
    }

    const userMoney = await ensureUserMoney(message.author.id);
    if (userMoney < cost)
      return message.reply(
        `${emojis.bot.error} | Yetersiz bakiye. Gerekli: ₺${shortNum(
          cost
        )} Senin: ₺${shortNum(userMoney)}`
      );

    const pf = await getPortfolio(message.author.id);
    const holding = pf[sym] || { qty: 0, avg: 0 };
    const newQty = holding.qty + qty;
    const newAvg =
      (holding.avg * holding.qty + coin.price * qty) / Math.max(1, newQty);
    pf[sym] = { qty: newQty, avg: newAvg };
    await savePortfolio(message.author.id, pf);

    await subMoney(message.author.id, cost);

    const embed = new MessageEmbed()
      .setTitle('başarılıyy~ :3 — Alım Başarılı')
      .setDescription(
        `${emojis.bot.succes} | ${qty.toFixed(
          8
        )} ${sym} alındı. Harcanan: ₺${shortNum(cost)}`
      )
      .addField(
        'Kalan para',
        `₺${shortNum(await ensureUserMoney(message.author.id))}`,
        true
      )
      .addField('Portföyde', `${newQty.toFixed(8)} ${sym}`, true)
      .setColor('#06b6d4');
    return message.channel.send({ embeds: [embed] });
  }

  async function sellCoin() {
    const sym = (args[1] || '').toUpperCase();
    const amountArg = (args[2] || '').toLowerCase();
    if (!sym || !amountArg)
      return message.reply(
        `${emojis.bot.error} | bi hhata oluşt~ :c Kullanım: coin sat <Sembol> <miktar|all|100$>`
      );
    const coin = await getCoin(sym);
    if (!coin)
      return message.reply(`${emojis.bot.error} | Böyle bir coin yok.`);

    const pf = await getPortfolio(message.author.id);
    const holding = pf[sym] || { qty: 0, avg: 0 };
    if (!holding.qty || holding.qty <= 0)
      return message.reply(`${emojis.bot.error} | Portföyünde bu coin yok.`);

    let sellQty = 0;
    let receive = 0;
    if (amountArg === 'all') {
      sellQty = holding.qty;
      receive = sellQty * coin.price;
    } else if (String(amountArg).endsWith('$')) {
      const cash = Number(String(amountArg).slice(0, -1));
      if (!cash || cash <= 0)
        return message.reply(`${emojis.bot.error} | Pozitif bir miktar gir.`);
      receive = Math.min(cash, holding.qty * coin.price);
      sellQty = receive / coin.price;
    } else {
      sellQty = Number(amountArg);
      if (!sellQty || sellQty <= 0)
        return message.reply(`${emojis.bot.error} | Pozitif bir miktar gir.`);
      if (sellQty > holding.qty)
        return message.reply(`${emojis.bot.error} | Yeterli coin yok.`);
      receive = sellQty * coin.price;
    }

    holding.qty = Math.max(0, holding.qty - sellQty);
    if (holding.qty === 0) delete pf[sym];
    else pf[sym] = holding;
    await savePortfolio(message.author.id, pf);

    await addMoney(message.author.id, receive);

    if (
      message.author.id === coin.creator &&
      !coin.creatorRefunded &&
      (!pf[sym] || pf[sym] === undefined)
    ) {
      try {
        await addMoney(message.author.id, CONFIG.CREATE_COST);
        coin.creatorRefunded = true;
        await saveCoin(sym, coin);
      } catch (e) {
        console.error('creator refund error', e);
      }
    }

    const embed = new MessageEmbed()
      .setTitle('başarılıyy~ :3 — Satış Başarılı')
      .setDescription(
        `${emojis.bot.succes} | ${sellQty.toFixed(
          8
        )} ${sym} satıldı. Elde edilen: ₺${shortNum(receive)}`
      )
      .addField(
        'Yeni bakiye',
        `₺${shortNum(await ensureUserMoney(message.author.id))}`,
        true
      )
      .setColor('#ef4444');
    return message.channel.send({ embeds: [embed] });
  }

  async function showPortfolio() {
    const pf = await getPortfolio(message.author.id);
    const keys = Object.keys(pf);
    const rows = [];
    let total = 0;
    for (const s of keys) {
      const h = pf[s];
      const coin = (await getCoin(s)) || { price: 0 };
      const val = h.qty * coin.price;
      const pnl = val - h.qty * h.avg;
      total += val;
      rows.push(
        `**${s}** | QTY: ${h.qty.toFixed(8)} | AVG: ₺${formatMoneyTR(
          h.avg
        )} | VALUE: ₺${shortNum(val)} | P/L: ₺${shortNum(pnl)}`
      );
    }
    const cash = await ensureUserMoney(message.author.id);
    if (rows.length === 0)
      return message.channel.send(
        `${
          emojis.bot.error
        } | Cüzdan boş, para yoksa üzülme 🙃 Nakit: ₺${shortNum(cash)}`
      );
    const embed = new MessageEmbed()
      .setTitle(`${message.author.username} — Cüzdan`)
      .setDescription(rows.join('\n'))
      .addField('Portföy değeri', `₺${shortNum(total)}`, true)
      .addField('Nakit', `₺${shortNum(cash)}`, true)
      .setColor('#f59e0b');
    return message.channel.send({ embeds: [embed] });
  }

  async function graphCoin() {
    const sym = (args[1] || '').toUpperCase();
    if (!sym)
      return message.reply(
        `${emojis.bot.error} | bi hhata oluşt~ :c Kullanım: coin grafik <Sembol>`
      );
    const coin = await getCoin(sym);
    if (!coin)
      return message.reply(`${emojis.bot.error} | Böyle bir coin yok.`);
    try {
      const canvas = Canvas.createCanvas(
        CONFIG.GRAPH.width,
        CONFIG.GRAPH.height
      );
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#0b1221';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = 'bold 22px Sans';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(
        `${coin.name} (${coin.symbol}) — ₺${formatMoneyTR(coin.price)}`,
        20,
        30
      );
      const history = (coin.history || []).slice(-CONFIG.HISTORY_LEN);
      if (history.length < 2) {
        ctx.font = '16px Sans';
        ctx.fillStyle = '#fff';
        ctx.fillText('Yetersiz veri, grafik gösterilemiyor.', 20, 70);
        const buffer = canvas.toBuffer();
        const attach = new MessageAttachment(buffer, `${sym}_graph.png`);
        return message.channel.send({ files: [attach] });
      }
      const prices = history.map((h) => Number(h.p));
      const maxP = Math.max(...prices);
      const minP = Math.min(...prices);
      const pad = (maxP - minP) * 0.15 || maxP * 0.1;
      const top = maxP + pad;
      const bottom = Math.max(0.00000001, minP - pad);
      const gx = 50,
        gy = 60,
        gw = canvas.width - gx - 30,
        gh = canvas.height - gy - 40;
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      ctx.font = '12px Sans';
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      const gridCount = 5;
      for (let i = 0; i <= gridCount; i++) {
        const y = gy + (gh / gridCount) * i;
        ctx.beginPath();
        ctx.moveTo(gx, y);
        ctx.lineTo(gx + gw, y);
        ctx.stroke();
        const val = top - ((top - bottom) / gridCount) * i;
        ctx.fillText(val.toFixed(6), 10, y + 4);
      }
      ctx.beginPath();
      for (let i = 0; i < history.length; i++) {
        const x = gx + gw * (i / (history.length - 1));
        const yPct = (history[i].p - bottom) / (top - bottom);
        const y = gy + gh - yPct * gh;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.lineTo(gx + gw, gy + gh);
      ctx.lineTo(gx, gy + gh);
      ctx.closePath();
      ctx.fillStyle = 'rgba(52,211,153,0.08)';
      ctx.fill();
      const buffer = canvas.toBuffer();
      const attach = new MessageAttachment(buffer, `${sym}_graph.png`);
      return message.channel.send({ files: [attach] });
    } catch (err) {
      console.error('graph error', err);
      return message.reply(
        `${emojis.bot.error} | bi hhata oluşt~ :c Grafik hatası.`
      );
    }
  }

  async function recommend() {
    const coins = await getAllCoins();
    const arr = [];
    for (const k of Object.keys(coins)) {
      const c = coins[k];
      const hist = (c.history || []).slice(-30);
      if (hist.length < 2) continue;
      let sumPct = 0;
      let cnt = 0;
      for (let i = 1; i < hist.length; i++) {
        sumPct += percent(hist[i - 1].p, hist[i].p);
        cnt++;
      }
      const avg = cnt ? sumPct / cnt : 0;
      const deltas = hist
        .map((h, i) => (i > 0 ? percent(hist[i - 1].p, h.p) : 0))
        .slice(1);
      const vol = stddev(deltas);
      const supplyFactor = Math.log10(Math.max(1, c.supply || 1));
      const score = avg * 2 - vol + supplyFactor * 0.1;
      arr.push({ sym: k, score, avg, vol });
    }
    if (arr.length === 0)
      return message.channel.send(
        `${emojis.bot.error} | Henüz öneri üretecek kadar veri yok.`
      );
    arr.sort((a, b) => b.score - a.score);
    const top = arr
      .slice(0, 5)
      .map(
        (t, i) =>
          `${i + 1}. ${t.sym} — score:${t.score.toFixed(3)} avg:${t.avg.toFixed(
            3
          )} vol:${t.vol.toFixed(3)}`
      );
    return message.channel.send(
      `${emojis.bot.succes} | Tavsiyeler:
` + top.join('\n')
    );
  }

  async function tickMarket() {
    const isBotOwner = (() => {
      const cfg = client.config || {};
      const ownerId = cfg.ownerId || cfg.owner || null;
      if (ownerId && String(ownerId) === String(message.author?.id))
        return true;
      if (Array.isArray(cfg.owners) && cfg.owners.includes(message.author?.id))
        return true;
      return false;
    })();
    const isManager = !!(
      message.member &&
      message.member.permissions &&
      message.member.permissions.has('MANAGE_GUILD')
    );
    if (!isBotOwner && !isManager)
      return message.reply(`${emojis.bot.error} | Yetkin yok.`);
    if (marketTickerStarted)
      return message.channel.send(
        `${emojis.bot.error} | Zaten piyasa 5 dakikada bir güncelleniyor.`
      );
    try {
      await tickMarketImmediate();
      startMarketTicker(client, db);
      return message.channel.send(
        `${emojis.bot.succes} | Piyasa zamanlayıcısı başlatıldı — her 5 dakikada bir güncellenecek.`
      );
    } catch (e) {
      console.error('tick start error', e);
      return message.channel.send(
        `${emojis.bot.error} | bi hhata oluşt~ :c Zamanlayıcı başlatılamadı.`
      );
    }
  }

  async function tickMarketImmediate() {
    if (tickingLock)
      return message.channel.send(
        `${emojis.bot.error} | Piyasa zaten güncelleniyor, bekle lütfen.`
      );
    tickingLock = true;
    try {
      const coins = await getAllCoins();
      if (!coins || Object.keys(coins).length === 0)
        return message.channel.send(`${emojis.bot.error} | Piyasada coin yok.`);
      for (const s of Object.keys(coins)) {
        const c = coins[s];
        const oldPrice = Number(c.price);
        const change = computePriceChange(c);
        let newPrice = Number((oldPrice * (1 + change)).toFixed(8));
        if (!Number.isFinite(newPrice) || newPrice <= 0)
          newPrice = Math.max(0.00000001, Math.abs(newPrice));
        c.price = newPrice;
        c.history = c.history || [];
        c.history.push({ t: Date.now(), p: c.price });
        if (c.history.length > CONFIG.HISTORY_LEN) c.history.shift();
        const delta = newPrice - oldPrice;
        const profit = delta * 2;
        if (c.creator && c.creator !== 'system') {
          try {
            if (profit > 0) await addMoney(c.creator, profit);
            else if (profit < 0) await subMoney(c.creator, Math.abs(profit));
          } catch (e) {
            console.error('creator money update error', e);
          }
        }
      }
      await saveAllCoins(coins);
      return message.channel.send(
        `${emojis.bot.succes} | Piyasa güncellendi, bi tık!`
      );
    } catch (e) {
      console.error('tickMarketImmediate error', e);
      return message.channel.send(
        `${emojis.bot.error} | bi hhata oluşt~ :c Piyasa güncellenemedi.`
      );
    } finally {
      tickingLock = false;
    }
  }

  function computePriceChange(coin) {
    const hist = (coin.history || []).slice(-20);
    let momentum = 0;
    for (let i = 1; i < hist.length; i++)
      momentum += percent(hist[i - 1].p, hist[i].p);
    momentum = hist.length > 1 ? momentum / Math.max(1, hist.length - 1) : 0;
    const deltas = hist
      .map((h, i) => (i > 0 ? percent(hist[i - 1].p, h.p) : 0))
      .slice(1);
    const vol = stddev(deltas);
    const supplyFactor = Math.log10(Math.max(1, coin.supply || 1));
    const noise =
      Math.random() * CONFIG.TICK_MAX_MOVE * 2 - CONFIG.TICK_MAX_MOVE;
    const change =
      noise * 0.6 +
      momentum * 0.002 -
      vol * 0.0005 +
      supplyFactor * 0.0001 +
      (coin.drift || 0);
    return Math.max(
      -CONFIG.TICK_MAX_MOVE,
      Math.min(CONFIG.TICK_MAX_MOVE, change)
    );
  }

  function stddev(arr) {
    if (!Array.isArray(arr) || arr.length === 0) return 0;
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    const variance =
      arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / arr.length;
    return Math.sqrt(variance);
  }
};

function startMarketTicker(client, db) {
  if (marketTickerStarted) return;
  marketTickerStarted = true;
  (async function seedIfNeeded() {
    try {
      const coins = (await db.get(CONFIG.COINS_KEY)) || {};
      if (Object.keys(coins).length === 0) {
        const seed = {};
        for (const c of CONFIG.DEFAULT_COINS) {
          seed[c.symbol] = {
            symbol: c.symbol,
            name: c.name,
            price: Number(c.price),
            supply: c.supply,
            creator: 'system',
            creatorTag: 'Default',
            history: [{ t: Date.now(), p: Number(c.price) }],
            createdAt: Date.now(),
            drift: 0,
            creatorRefunded: false,
          };
        }
        await db.set(CONFIG.COINS_KEY, seed);
      }
    } catch (e) {
      console.error('seed error', e);
    }
  })();

  function computeChangeFor(coin) {
    const history = (coin.history || []).slice(-30);
    if (history.length < 2) {
      return (Math.random() * 2 - 1) * CONFIG.TICK_MAX_MOVE * 0.05;
    }

    const deltas = [];
    for (let i = 1; i < history.length; i++) {
      const p0 = Number(history[i - 1].p) || 1;
      const p1 = Number(history[i].p) || p0;
      deltas.push((p1 - p0) / p0);
    }

    const momentum =
      deltas.reduce((a, b) => a + b, 0) / Math.max(1, deltas.length);
    const vol = stddev(deltas);
    const meanPrice =
      history.reduce((a, b) => a + Number(b.p || 0), 0) / history.length;

    const reversion =
      ((meanPrice - Number(coin.price)) / Math.max(1, Number(coin.price))) *
      0.2;
    const supplyFactor = Math.log10(Math.max(1, coin.supply || 1)) * 0.00005;
    const noise = (Math.random() * 2 - 1) * CONFIG.TICK_MAX_MOVE * 0.25;

    let ch =
      0.5 * momentum +
      reversion -
      0.3 * vol +
      supplyFactor +
      noise +
      (coin.drift || 0) * 0.05;

    ch = Math.max(-CONFIG.TICK_MAX_MOVE, Math.min(CONFIG.TICK_MAX_MOVE, ch));
    return ch;
  }

  setInterval(async () => {
    if (tickingLock) return;
    tickingLock = true;
    try {
      const coins = (await db.get(CONFIG.COINS_KEY)) || {};
      for (const s of Object.keys(coins)) {
        const c = coins[s];
        const oldPrice = Number(c.price);
        const change = computeChangeFor(c);
        let newPrice = Number((oldPrice * (1 + change)).toFixed(8));
        if (!Number.isFinite(newPrice) || newPrice <= 0)
          newPrice = Math.max(0.00000001, Math.abs(newPrice));
        c.price = newPrice;
        c.history = c.history || [];
        c.history.push({ t: Date.now(), p: c.price });
        if (c.history.length > CONFIG.HISTORY_LEN) c.history.shift();
        const delta = newPrice - oldPrice;
        const profit = delta * 2;
        if (c.creator && c.creator !== 'system') {
          try {
            if (profit > 0) {
              if (client.eco && typeof client.eco.addMoney === 'function') {
                await client.eco.addMoney(c.creator, profit);
              } else {
                const key = CONFIG.MONEY_PREFIX + c.creator;
                const val = Number((await db.get(key)) || 0) + Number(profit);
                await db.set(key, val);
              }
            } else if (profit < 0) {
              if (client.eco && typeof client.eco.removeMoney === 'function') {
                await client.eco.removeMoney(c.creator, Math.abs(profit));
              } else {
                const key = CONFIG.MONEY_PREFIX + c.creator;
                const val = Math.max(
                  0,
                  Number((await db.get(key)) || 0) - Math.abs(profit)
                );
                await db.set(key, val);
              }
            }
          } catch (e) {
            console.error('creator money update error', e);
          }
        }
      }
      await db.set(CONFIG.COINS_KEY, coins);
    } catch (e) {
      console.error('scheduled tick error', e);
    } finally {
      tickingLock = false;
    }
  }, CONFIG.TICK_INTERVAL_MS);
}
