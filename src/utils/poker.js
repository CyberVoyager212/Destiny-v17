const {
  MessageEmbed,
  MessageActionRow,
  MessageSelectMenu,
  MessageButton,
} = require("discord.js");

const emojis = require("../emoji.json");

function createDeck() {
  const suits = ["♠", "♥", "♦", "♣"];
  const values = [
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "J",
    "Q",
    "K",
    "A",
  ];
  const deck = [];
  for (const suit of suits) {
    for (const value of values) {
      deck.push({ value, suit });
    }
  }
  return deck.sort(() => Math.random() - 0.5);
}

const cardOrder = {
  2: 2,
  3: 3,
  4: 4,
  5: 5,
  6: 6,
  7: 7,
  8: 8,
  9: 9,
  10: 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
};

function evaluate5(hand) {
  const sorted = hand
    .slice()
    .sort((a, b) => cardOrder[a.value] - cardOrder[b.value]);
  const values = sorted.map((c) => c.value);
  const suits = sorted.map((c) => c.suit);
  const isFlush = suits.every((s) => s === suits[0]);
  const nums = sorted.map((c) => cardOrder[c.value]);
  let isStraight = false,
    straightHigh = null;

  if (nums.every((n, i) => i === 0 || n === nums[i - 1] + 1)) {
    isStraight = true;
    straightHigh = nums[4];
  } else {
    const low = [2, 3, 4, 5, 14];
    const uniq = [...new Set(nums)].sort((a, b) => a - b);
    if (uniq.length === 5 && low.every((v, i) => uniq[i] === v)) {
      isStraight = true;
      straightHigh = 5;
    }
  }

  const freq = {};
  for (const v of values) freq[v] = (freq[v] || 0) + 1;
  const counts = Object.values(freq);
  const four = counts.includes(4);
  const three = counts.includes(3);
  const pairs = counts.filter((c) => c === 2).length;

  if (isStraight && isFlush && straightHigh === 14)
    return { rank: 10, name: "Royal Flush" };
  if (isStraight && isFlush) return { rank: 9, name: "Straight Flush" };
  if (four) return { rank: 8, name: "Four of a Kind" };
  if (three && pairs === 1) return { rank: 7, name: "Full House" };
  if (isFlush) return { rank: 6, name: "Flush" };
  if (isStraight) return { rank: 5, name: "Straight" };
  if (three) return { rank: 4, name: "Three of a Kind" };
  if (pairs === 2) return { rank: 3, name: "Two Pair" };
  if (pairs === 1) return { rank: 2, name: "One Pair" };
  return { rank: 1, name: "High Card" };
}

function getCombinations(arr, k) {
  const results = [];
  function comb(tmp, start) {
    if (tmp.length === k) {
      results.push(tmp);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      comb(tmp.concat(arr[i]), i + 1);
    }
  }
  comb([], 0);
  return results;
}

function evaluateHand(cards) {
  const combos = getCombinations(cards, 5);
  let best = { rank: 0, name: "" };
  for (const hand of combos) {
    const res = evaluate5(hand);
    if (res.rank > best.rank) best = res;
  }
  return best;
}

const cardEmoji = emojis.cards || {};
const cardBack = emojis.cardBack || "❔";

function chooseEmoji(amount) {
  if (amount > 100000) return emojis.money?.high || "💰";
  if (amount > 10000) return emojis.money?.medium || "💵";
  return emojis.money?.low || "🪙";
}

const SUCC = (emojis.bot && emojis.bot.succes) || "✅";
const ERR = (emojis.bot && emojis.bot.error) || "❌";

// Güvenli interaction güncelleme yardımcı fonksiyonu
async function safeUpdateInteraction(interaction, data) {
  try {
    // Eğer interaction henüz yanıtlanmadıysa update kullan
    if (!interaction.replied && !interaction.deferred) {
      return await interaction.update(data);
    }
    // Zaten cevaplandıysa followUp / editReply ile devam et
    if (interaction.deferred || interaction.replied) {
      // followUp kullanmak istemiyorsak editReply ile de düzenleyebiliriz
      try {
        return await interaction.followUp?.(data);
      } catch (e) {
        try {
          return await interaction.editReply?.(data);
        } catch (e2) {
          return null;
        }
      }
    }
    return null;
  } catch (err) {
    // Son çare: hata varsa sessizce yakala
    console.error("safeUpdateInteraction error:", err);
    return null;
  }
}

// --- Modül export ----------------------------------------------------------
exports.execute = async (client, message, args) => {
  const user = message.author;
  const displayName = message.member?.displayName || user.username;

  const raiseMessages = [
    "Dostum, raise yapıyorum, hadi oyunu ısıtalım~",
    "Raise: Bahsi artırıyorum, ne yapacaksın owo?",
    "Ben raise yapıyorum, meydanı sallıyorum~",
    "Raise yapıyorum, hamleni göreyim~",
    "Raise: Bahsimi yükseltiyorum, oyuna renk katıyorum~",
  ];
  const callMessages = [
    "Call yapıyorum, seninle aynıyım~",
    "Call: Bahsi eşitliyorum, devam ediyorum~",
    "Ben call yapıyorum, hamlemi takip ediyorum~",
    "Call: Oyunda kalıyorum, bakalım ne olacak~",
    "Call yapıyorum, hamleni görüyorum~",
  ];
  const foldMessages = [
    "Fold: Bu eli bırakıyorum, benim için şanslı değil~",
    "Fold ediyorum, bugün şansım yaver gitmedi~",
    "Fold: Elimde iyi bir şey yok, çekiliyorum~",
    "Fold ediyorum, oyundan çıkıyorum~",
    "Fold: Bu tur bana göre değil~",
  ];

  // bakiye çekme (economy sisteminizin api'sine göre çalışır)
  let balanceData;
  try {
    balanceData = await client.eco.fetchMoney(user.id);
  } catch (e) {
    console.error("eco.fetchMoney hata:", e);
    return message.channel.send(`${ERR} Sunucudan bakiye alınamadı, sonra tekrar dene.`);
  }

  const balance =
    typeof balanceData === "object" && balanceData.amount != null
      ? balanceData.amount
      : Number(balanceData) || 0;

  if (balance < 10) {
    return message.channel.send(
      `${ERR} **${displayName}**, oynamak için en az 10 ${chooseEmoji(10)} gerekiyor~ Biraz daha biriktir, sonra gel nyaa~`
    );
  }

  const betEmbed = new MessageEmbed()
    .setTitle(`${SUCC} Poker Bahsi`)
    .setDescription(
      `Bakiyen: **${balance.toLocaleString()}** ${chooseEmoji(
        balance
      )}\nLütfen bir bahis miktarı seç.`
    )
    .setColor("BLUE");

  const betRow = new MessageActionRow().addComponents(
    new MessageSelectMenu()
      .setCustomId("poker_bet")
      .setPlaceholder("Bahis miktarı seçin")
      .addOptions([
        { label: "10", value: "10" },
        { label: "50", value: "50" },
        { label: "100", value: "100" },
        { label: "1.000", value: "1000" },
        { label: "10.000", value: "10000" },
        { label: "50.000", value: "50000" },
        { label: "75.000", value: "75000" },
        { label: "100.000", value: "100000" },
        { label: "250.000", value: "250000" },
        { label: "All", value: "all" },
      ])
  );

  const menuMsg = await message.channel.send({
    embeds: [betEmbed],
    components: [betRow],
  });

  const filter = (i) => i.user.id === user.id && i.customId === "poker_bet";

  let selectionInteraction;
  let betAmount;

  // Seçim döngüsü (geçersiz seçimlerde tekrar ister)
  while (true) {
    try {
      selectionInteraction = await menuMsg.awaitMessageComponent({
        filter,
        componentType: "SELECT_MENU",
        time: 60000,
      });

      // Burada deferUpdate kullanmıyoruz — doğrudan kontrol edip gerekirse ephemeral reply atıyoruz.
      const choice = selectionInteraction.values[0];
      const refreshed = await client.eco.fetchMoney(user.id);
      const refreshedBalance =
        typeof refreshed === "object" && refreshed.amount != null
          ? refreshed.amount
          : Number(refreshed) || 0;

      betAmount =
        choice === "all" ? Math.min(refreshedBalance, 250000) : parseInt(choice, 10);

      if (isNaN(betAmount) || betAmount < 10 || betAmount > 250000) {
        await selectionInteraction.reply({
          content: `${ERR} **${displayName}**, geçersiz bahis seçtin~ Lütfen 10 ile 250.000 arasında bir değer seç, tamam mı~`,
          ephemeral: true,
        });
        continue; // tekrar seçim bekle
      }

      if (betAmount > refreshedBalance) {
        await selectionInteraction.reply({
          content: `${ERR} **${displayName}**, yeterli bakiye yok~ Bahis menüsünü tekrar açıyorum, lütfen yeniden seç owo~`,
          ephemeral: true,
        });
        continue;
      }

      // Geçerli seçim bulundu -> döngüden çık
      break;
    } catch (err) {
      // Zaman aşımı veya hata
      try {
        await menuMsg.edit({
          content: `${ERR} Süre doldu~ Bahis seçilmedi, istersen tekrar deneyebilirsin~`,
          embeds: [],
          components: [],
        });
      } catch (e) {
        console.error("menuMsg.edit hata:", e);
      }
      return;
    }
  }

  // Bahsi çek
  try {
    await client.eco.removeMoney(user.id, betAmount);
  } catch (e) {
    console.error("eco.removeMoney hata:", e);
    return message.channel.send(`${ERR} Bahis alınırken bir hata oldu.`);
  }

  // Kart dağıtımı
  const deck = createDeck();
  const playerHand = [deck.pop(), deck.pop()];
  const bots = [
    { name: "Bot 1", hand: [deck.pop(), deck.pop()] },
    { name: "Bot 2", hand: [deck.pop(), deck.pop()] },
    { name: "Bot 3", hand: [deck.pop(), deck.pop()] },
  ];
  const community = [deck.pop(), deck.pop(), deck.pop(), deck.pop(), deck.pop()];

  const toEmoji = (cards) =>
    cards.map((c) => cardEmoji[c.value] || cardBack).join(" ");

  const startEmbed = new MessageEmbed()
    .setTitle(`${SUCC} Poker Oyunu Başladı!`)
    .setDescription(
      `**Senin Kartların:** ${toEmoji(playerHand)}\n\n` +
        `**Bot Kartları:**\n${bots
          .map((b) => `${b.name}: ${cardBack} ${cardBack}`)
          .join("\n")}\n\n` +
        `**Topluluk Kartları:** ${toEmoji(community)}\n\n` +
        `Bahis: **${betAmount}** ${chooseEmoji(betAmount)}`
    )
    .setColor("GREEN");

  // Son geçerli interaction üzerinde update yapmayı deneyelim.
  try {
    await safeUpdateInteraction(selectionInteraction, { embeds: [startEmbed], components: [] });
  } catch (e) {
    // Fallback: menu mesajını düzenle
    try {
      await menuMsg.edit({ embeds: [startEmbed], components: [] });
    } catch (e2) {
      console.error("Embed güncelleme başarısız:", e2);
    }
  }

  // Hamle butonları
  const actionRow = new MessageActionRow().addComponents(
    new MessageButton().setCustomId("action_raise").setLabel("Raise").setStyle("PRIMARY"),
    new MessageButton().setCustomId("action_call").setLabel("Call").setStyle("SUCCESS"),
    new MessageButton().setCustomId("action_fold").setLabel("Fold").setStyle("DANGER")
  );

  const actionMsg = await message.channel.send({
    content: "Hamleni seç:",
    components: [actionRow],
  });

  const actionCollector = actionMsg.createMessageComponentCollector({
    filter: (i) => i.user.id === user.id,
    componentType: "BUTTON",
    time: 30000,
  });

  actionCollector.on("collect", async (ai) => {
    try {
      let extraBet = 0;
      if (ai.customId === "action_fold") {
        // fold -> kullanıcı kaybeder
        try {
          await ai.update({
            content: `${ERR} ${displayName}, fold ettin~ Oyunu kaybettin, üzgünüm~`,
            components: [],
          });
        } catch (e) {
          // fallback
          await ai.reply({ content: `${ERR} ${displayName}, fold ettin~`, ephemeral: true });
        }
        // Botlar kazanır, bahis geri verilmez
        return actionCollector.stop("user_fold");
      }

      if (ai.customId === "action_raise") {
        extraBet = Math.floor(betAmount * 0.5);
        const refreshed = await client.eco.fetchMoney(user.id);
        const refreshedBalance =
          typeof refreshed === "object" && refreshed.amount != null
            ? refreshed.amount
            : Number(refreshed) || 0;
        if (extraBet > refreshedBalance) {
          try {
            await ai.update({
              content: `${ERR} **${displayName}**, raise için yeterli bakiye yok~`,
              components: [],
            });
          } catch (e) {
            await ai.reply({ content: `${ERR} raise için yeterli bakiye yok~`, ephemeral: true });
          }
          return actionCollector.stop("insufficient_raise");
        }
        await client.eco.removeMoney(user.id, extraBet);
        betAmount += extraBet;
        await ai.update({
          content: `${SUCC} Raise yaptın! Yeni bahis: **${betAmount}** ${chooseEmoji(betAmount)}`,
          components: [],
        });
      } else if (ai.customId === "action_call") {
        await ai.update({
          content: `${SUCC} Call yaptın. Oyuna devam ediyorsun~`,
          components: [],
        });
      }

      // Bot davranışlarını hesapla
      bots.forEach((bot) => {
        const score = evaluateHand(bot.hand.concat(community));
        let action, msg;
        if (score.rank >= 9) {
          action = "raises";
          msg = raiseMessages[Math.floor(Math.random() * raiseMessages.length)];
          bot.active = true;
        } else if (score.rank >= 2) {
          action = "calls";
          msg = callMessages[Math.floor(Math.random() * callMessages.length)];
          bot.active = true;
        } else {
          if (Math.random() < 0.3) {
            action = Math.random() < 0.5 ? "raises" : "calls";
            msg = (action === "raises" ? raiseMessages : callMessages)[
              Math.floor(Math.random() * 5)
            ];
            bot.active = true;
          } else {
            action = "folds";
            msg = foldMessages[Math.floor(Math.random() * foldMessages.length)];
            bot.active = false;
          }
        }
        bot.action = `${bot.name}: ${msg} (El: ${score.name})`;
      });

      const botEmbed = new MessageEmbed()
        .setTitle("🤖 Bot Hamleleri")
        .setDescription(bots.map((b) => b.action).join("\n"))
        .setColor("ORANGE");
      await message.channel.send({ embeds: [botEmbed] });
      await message.channel.send("💬 Botlar arasında kısa bir sohbet geçiyor...");

      // Kısa bekleme sonra sonuca bak
      setTimeout(async () => {
        const activeBots = bots.filter((b) => b.active);
        if (activeBots.length === 0) {
          try {
            await client.eco.addMoney(user.id, betAmount * 2);
          } catch (e) {
            console.error("eco.addMoney hata:", e);
          }
          return message.channel.send(
            `${SUCC} Kazandın! Tüm botlar fold etti. **${betAmount * 2}** ${chooseEmoji(
              betAmount
            )} kazandın~`
          );
        }

        const playerScore = evaluateHand(playerHand.concat(community));
        const botScores = activeBots.map((b) => ({
          name: b.name,
          score: evaluateHand(b.hand.concat(community)),
        }));
        const all = [...botScores, { name: "Sen", score: playerScore }].sort(
          (a, b) => b.score.rank - a.score.rank
        );

        const winner = all[0];
        if (winner.name === "Sen") {
          try {
            await client.eco.addMoney(user.id, betAmount * 2);
          } catch (e) {
            console.error("eco.addMoney hata:", e);
          }
          return message.channel.send(
            `${SUCC}  Kazanan: Sen! (${playerScore.name}) **${betAmount * 2}** ${chooseEmoji(
              betAmount
            )} kazandın~`
          );
        } else {
          return message.channel.send(
            `${ERR}  Kaybettin! Kazanan: **${winner.name}** (${winner.score.name}).`
          );
        }
      }, 5000);
    } catch (e) {
      console.error("actionCollector collect hatasi:", e);
      try {
        await ai?.reply?.({ content: `${ERR} Bir hata oldu.`, ephemeral: true });
      } catch (e) {}
    }
  });

  actionCollector.on("end", async (collected, reason) => {
    if (collected.size === 0) {
      try {
        await actionMsg.edit({
          content: `${ERR}  Süre doldu, hamle yapmadın~`,
          components: [],
        });
      } catch (e) {
        console.error("actionMsg.edit hata:", e);
      }
    }
  });
};
