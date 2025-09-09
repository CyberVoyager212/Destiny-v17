// commands/car.js
// Discord.js v13
const { MessageActionRow, MessageButton, MessageEmbed } = require("discord.js");
const emojis = require("../emoji.json");

// ---------- SAFE EDIT helper (throttle + retry) ----------
const editState = new WeakMap();
async function safeEdit(message, payload, opts = {}) {
  const minInterval = opts.minInterval ?? 120;
  let st = editState.get(message);
  if (!st) {
    st = { lastEdit: 0, queued: null };
    editState.set(message, st);
  }
  const now = Date.now();
  const since = now - st.lastEdit;

  if (since < minInterval) {
    if (st.queued) clearTimeout(st.queued);
    st.queued = setTimeout(async () => {
      try {
        await message.edit(payload);
        st.lastEdit = Date.now();
      } catch (err) {
        if (err?.status === 429 || err?.code === 429) {
          const wait = err?.retry_after || 1000;
          setTimeout(() => safeEdit(message, payload, opts), wait + 50);
        } else {
          console.error("safeEdit error:", err);
        }
      } finally {
        st.queued = null;
      }
    }, minInterval - since + 10);
    return;
  }

  try {
    await message.edit(payload);
    st.lastEdit = Date.now();
  } catch (err) {
    if (err?.status === 429 || err?.code === 429) {
      const wait = err?.retry_after || 1000;
      setTimeout(() => safeEdit(message, payload, opts), wait + 50);
    } else {
      console.error("safeEdit error:", err);
    }
  }
}

// ---------- Komut export ----------
exports.help = {
  name: "car",
  description:
    "Yukarıdan gelen arabalardan ve gelen trenlerden kaçın — sola/sağa/yukarı/aşağı hareket edin, elma toplayın, ult atlayın.",
  usage: "car",
  category: "Eğlence",
  cooldown: 5,
};

exports.execute = async (client, message, args = []) => {
  const playerId = message.author.id;
  const gridWidth = 7;
  const gridHeight = 10;

  const difficulties = [
    {
      id: "easy",
      label: "Kolay",
      baseSpeed: 700,
      spawnEvery: 1200,
      trainEvery: 8000,
      trainCount: 0.5,
    },
    {
      id: "normal",
      label: "Orta",
      baseSpeed: 500,
      spawnEvery: 900,
      trainEvery: 6000,
      trainCount: 1,
    },
    {
      id: "hard",
      label: "Zor",
      baseSpeed: 350,
      spawnEvery: 700,
      trainEvery: 4500,
      trainCount: 1.6,
    },
  ];

  const diffEmbed = new MessageEmbed()
    .setTitle("🚦 Araba Kaçış - Zorluk Seçimi")
    .setDescription("Bir zorluk seçin (butonlara tıklayın):")
    .setColor("#1E90FF")
    .setFooter({ text: `${message.member.displayName} için seçim yapın` });

  const diffRow = new MessageActionRow().addComponents(
    difficulties.map((d) =>
      new MessageButton()
        .setCustomId(`diff_${d.id}`)
        .setLabel(d.label)
        .setStyle("PRIMARY")
    )
  );
  const cancelRow = new MessageActionRow().addComponents(
    new MessageButton().setCustomId("diff_cancel").setLabel("İptal").setStyle("DANGER")
  );

  const modeMsg = await message.channel.send({
    embeds: [diffEmbed],
    components: [diffRow, cancelRow],
  });

  const filter = (i) => i.user.id === playerId && i.message.id === modeMsg.id;
  const collector = modeMsg.createMessageComponentCollector({
    filter,
    time: 30_000,
    max: 1,
  });

  collector.on("collect", async (int) => {
    try {
      if (int.customId === "diff_cancel") {
        await int.update({
          content: `${emojis.bot.succes} | Tamam~ İptal edildi. İstediğin zaman yeniden başlatabilirsin :)`,
          embeds: [],
          components: [],
        });
        return;
      }
      const chosen = difficulties.find((d) => `diff_${d.id}` === int.customId);
      if (!chosen)
        return await int.update({
          content: `${emojis.bot.error} | Hups! Seçimini anlayamadım~ Bir daha dener misin?`,
          embeds: [],
          components: [],
        });

      await int.update({
        content: `${emojis.bot.succes} | ${chosen.label} modu başlatılıyor... Hazırsan iyi şanslar~`,
        embeds: [],
        components: [],
      });
      setTimeout(() => startGame(client, message, chosen), 350);
    } catch (e) {
      console.error("diff collect hata:", e);
      try {
        await int.update({
          content: `${emojis.bot.error} | Üzgünüm! Zorluk seçimi sırasında bir şeyler ters gitti~ Daha sonra tekrar dene.`,
          embeds: [],
          components: [],
        });
      } catch {}
    }
  });

  collector.on("end", (collected) => {
    if (collected.size === 0)
      modeMsg
        .edit({
          content: `${emojis.bot.error} | Süre doldu, zorluk seçilmedi~ Dilediğinde tekrar başlatabilirsin!`,
          embeds: [],
          components: [],
        })
        .catch(() => {});
  });

  async function startGame(client, triggerMessage, diff) {
    const cfg = {
      gridWidth,
      gridHeight,
      baseSpeed: diff.baseSpeed,
      spawnEvery: diff.spawnEvery,
      trainEvery: diff.trainEvery,
      trainIntensity: diff.trainCount,
      minEditInterval: 100,
      hasLeaderboard: true,
    };

    let playerX = Math.floor(cfg.gridWidth / 2);
    let playerY = cfg.gridHeight - 1;
    const maxUp = 0;
    const minDown = cfg.gridHeight - 1;

    let obstacles = [];
    let trains = [];
    let apple = null;

    let speed = cfg.baseSpeed;
    let tick = 0;
    let score = 0;
    let dodged = 0;
    let gameActive = true;
    let lastInteraction = Date.now();
    const inactivityLimit = 60_000;
    const startTime = Date.now();

    let ultCharges = 1;
    const ultMax = 1;
    let ultActiveTicks = 0;
    const ultDurationTicks = 3;
    let dodgedSinceUlt = 0;

    const leaderboardKey = `car-leaderboard-${triggerMessage.guild.id}-${diff.id}`;
    let leaderboard = (await client.db.get(leaderboardKey)) || [];

    function saveLeaderboardLocal() {
      if (!cfg.hasLeaderboard) return Promise.resolve();
      const name =
        (triggerMessage.member && triggerMessage.member.displayName) ||
        triggerMessage.author.username;
      leaderboard.push({
        name,
        score,
        time: Math.round((Date.now() - startTime) / 1000),
      });
      leaderboard.sort((a, b) => b.score - a.score || a.time - b.time);
      leaderboard = leaderboard.slice(0, 50);
      return client.db.set(leaderboardKey, leaderboard).catch(() => {});
    }

    function occupiedAt(x, y) {
      if (obstacles.some((o) => o.x === x && o.y === y)) return true;
      for (const t of trains) {
        for (let i = 0; i < t.length; i++) {
          const segX = t.x + (t.dir > 0 ? i : -i);
          if (segX === x && t.row === y) return true;
        }
      }
      return false;
    }

    function spawnObstacle() {
      const count = Math.random() < 0.6 ? 1 : 2;
      for (let i = 0; i < count; i++) {
        const x = Math.floor(Math.random() * cfg.gridWidth);
        obstacles.push({ x, y: 0 });
      }
    }

    function spawnTrain() {
      const possibleRows = [];
      for (let r = 1; r < cfg.gridHeight - 1; r++) possibleRows.push(r);
      if (possibleRows.length === 0) return;
      const row = possibleRows[Math.floor(Math.random() * possibleRows.length)];
      const dir = Math.random() < 0.5 ? 1 : -1;
      const length = Math.floor(Math.random() * 2) + 2;
      const x = dir > 0 ? -length : cfg.gridWidth + length - 1;
      trains.push({ row, x, dir, length });
    }

    function placeApple() {
      if (apple) return;
      if (Math.random() < 0.25) {
        apple = { x: Math.floor(Math.random() * cfg.gridWidth), y: 0 };
      }
    }

    function moveObstacles() {
      for (const o of obstacles) o.y += 1;
      const remaining = [];
      for (const o of obstacles) {
        if (o.y > playerY) {
          score += 5;
          dodged++;
          dodgedSinceUlt++;
          if (dodgedSinceUlt >= 5) {
            dodgedSinceUlt = 0;
            if (ultCharges < ultMax) ultCharges++;
          }
        } else remaining.push(o);
      }
      obstacles = remaining;
    }

    function moveTrains() {
      const rem = [];
      for (const t of trains) {
        t.x += t.dir;
        if (t.dir > 0 && t.x - t.length > cfg.gridWidth + 2) rem.push(t);
        else if (t.dir < 0 && t.x + t.length < -3) rem.push(t);
      }
      trains = trains.filter((t) => !rem.includes(t));
    }

    function renderGrid() {
      let s = "";
      for (let y = 0; y < cfg.gridHeight; y++) {
        for (let x = 0; x < cfg.gridWidth; x++) {
          if (x === playerX && y === playerY) {
            s += ultActiveTicks > 0 ? "🚗" : "🚗";
          } else if (apple && apple.x === x && apple.y === y) s += "🍎";
          else if (obstacles.some((o) => o.x === x && o.y === y)) s += "🚙";
          else {
            let trainHere = false;
            for (const t of trains) {
              for (let i = 0; i < t.length; i++) {
                const segX = t.x + (t.dir > 0 ? i : -i);
                if (segX === x && t.row === y) {
                  s += "🚆";
                  trainHere = true;
                  break;
                }
              }
              if (trainHere) break;
            }
            if (!trainHere) s += "⬛";
          }
        }
        s += "\n";
      }
      return s;
    }

    function baseEmbed() {
      return new MessageEmbed()
        .setTitle(`${emojis.bot.succes} | 🚗 Araba Kaçış • ${diff.label.toUpperCase()}`)
        .setDescription(
          `Puan: **${score}** • Geçirilen: **${dodged}** • Ult: ${ultCharges}/${ultMax} • UltAktif: ${ultActiveTicks > 0 ? ultActiveTicks : 0}\n\n${renderGrid()}`
        )
        .setColor("#00AA00")
        .setFooter({
          text: `${
            (triggerMessage.member && triggerMessage.member.displayName) ||
            triggerMessage.author.username
          } • Hız: ${Math.max(1, Math.round((1000 / speed) * 10) / 10)}`,
        });
    }

    const controlsRow1 = new MessageActionRow().addComponents(
      new MessageButton().setCustomId("c_left").setLabel("⬅️ Sol").setStyle("PRIMARY"),
      new MessageButton().setCustomId("c_right").setLabel("Sağ ➡️").setStyle("PRIMARY"),
      new MessageButton().setCustomId("c_up").setLabel("⬆️ Yukarı").setStyle("SECONDARY"),
      new MessageButton().setCustomId("c_down").setLabel("⬇️ Aşağı").setStyle("SECONDARY"),
      new MessageButton().setCustomId("c_ult").setLabel("ULT (Atla)").setStyle("SUCCESS")
    );

    const controlsRow2 = new MessageActionRow().addComponents(
      new MessageButton().setCustomId("c_quit").setLabel("❌ Çık").setStyle("DANGER")
    );

    const gameMessage = await triggerMessage.channel.send({
      embeds: [baseEmbed()],
      components: [controlsRow1, controlsRow2],
    });

    const compFilter = (i) => i.user.id === playerId && i.message.id === gameMessage.id;
    const compCollector = gameMessage.createMessageComponentCollector({
      filter: compFilter,
      time: 1000 * 60 * 20,
    });

    compCollector.on("collect", async (interaction) => {
      lastInteraction = Date.now();
      try {
        if (interaction.customId === "c_quit") {
          await interaction
            .update({
              content: `${emojis.bot.succes} | Tamam~ Oyun iptal edildi. Tekrar geldiğinde birlikte oynarız!`,
              embeds: [],
              components: [],
            })
            .catch(() => {});
          gameActive = false;
          compCollector.stop("quit");
          setTimeout(() => gameMessage.delete().catch(() => {}), 400);
          return;
        }

        if (interaction.customId === "c_left") {
          if (playerX > 0) playerX -= 1;
        }
        if (interaction.customId === "c_right") {
          if (playerX < cfg.gridWidth - 1) playerX += 1;
        }
        if (interaction.customId === "c_up") {
          if (playerY > 0) playerY -= 1;
        }
        if (interaction.customId === "c_down") {
          if (playerY < cfg.gridHeight - 1) playerY += 1;
        }
        if (interaction.customId === "c_ult") {
          if (ultCharges > 0 && ultActiveTicks === 0) {
            ultCharges -= 1;
            ultActiveTicks = ultDurationTicks;
          }
        }

        await interaction.deferUpdate().catch(() => {});
      } catch (e) {
        console.error("collector collect hata:", e);
        try {
          await interaction.deferUpdate().catch(() => {});
        } catch {}
      }
    });

    function checkCollision() {
      if (ultActiveTicks > 0) return false;
      if (obstacles.some((o) => o.x === playerX && o.y === playerY)) return true;
      for (const t of trains) {
        for (let i = 0; i < t.length; i++) {
          const segX = t.x + (t.dir > 0 ? i : -i);
          if (segX === playerX && t.row === playerY) return true;
        }
      }
      return false;
    }

    async function endGame(reason) {
      gameActive = false;
      try {
        await saveLeaderboardLocal();
      } catch (e) {
        console.error("LB save error:", e);
      }

      const endEmbed = new MessageEmbed()
        .setTitle(`${emojis.bot.error} | 💥 Oyun Bitti!`)
        .setDescription(`Puanınız: **${score}**\nSebep: ${reason}`)
        .setColor("#FF0000")
        .setFooter({
          text: `Geçirilen: ${dodged} • Süre: ${Math.round((Date.now() - startTime) / 1000)}s`,
        });

      await safeEdit(
        gameMessage,
        { embeds: [endEmbed], components: [] },
        { minInterval: cfg.minEditInterval }
      ).catch(() => {});

      if (cfg.hasLeaderboard) {
        setTimeout(async () => {
          const lb = (await client.db.get(leaderboardKey)) || leaderboard || [];
          const top = lb.slice(0, 10);
          const lbEmbed = new MessageEmbed()
            .setTitle(`🏁 Liderlik • ${diff.label.toUpperCase()}`)
            .setColor("#FFD700")
            .setDescription(
              top.length
                ? top
                    .map((e, i) => `${i + 1}. **${e.name}** — ${e.score} puan (${e.time}s)`)
                    .join("\n")
                : "Liderlik tablosu boş."
            );

          await triggerMessage.channel.send({ embeds: [lbEmbed] }).catch(() => {});
          await gameMessage.delete().catch(() => {});
        }, 800);
      } else {
        setTimeout(() => gameMessage.delete().catch(() => {}), 900);
      }

      compCollector.stop("ended");
    }

    let moveTimer = null;
    let lastTrainSpawn = Date.now();
    async function scheduleTick() {
      if (!gameActive) return;

      tick++;

      if (tick % Math.max(1, Math.round(cfg.spawnEvery / (speed || 1) / 100)) === 0) {
        if (Math.random() < Math.min(0.8, 0.2 + tick / 2000)) spawnObstacle();
      }

      if (
        Date.now() - lastTrainSpawn >
        Math.max(1000, cfg.trainEvery / Math.max(1, 1 + tick / 800))
      ) {
        const num =
          Math.random() < 0.5 ? 1 : Math.ceil(cfg.trainIntensity * (1 + tick / 2000));
        for (let i = 0; i < num; i++) spawnTrain();
        lastTrainSpawn = Date.now();
      }

      if (Math.random() < 0.06) placeApple();

      moveObstacles();
      moveTrains();

      if (apple && apple.x === playerX && apple.y === playerY) {
        score += 100;
        apple = null;
        if (ultCharges < ultMax) ultCharges++;
      }

      score += 1;

      if (ultActiveTicks > 0) ultActiveTicks--;

      if (checkCollision()) {
        await endGame("Arabaya veya trene çarptınız.");
        return;
      }

      if (Date.now() - lastInteraction > inactivityLimit) {
        await endGame("Zaman aşımı (etkileşim yok).");
        return;
      }

      await safeEdit(
        gameMessage,
        { embeds: [baseEmbed()], components: [controlsRow1, controlsRow2] },
        { minInterval: cfg.minEditInterval }
      ).catch(() => {});

      if ((Date.now() - startTime) % 12000 < 50) {
        speed = Math.max(100, speed - 15);
      }

      moveTimer = setTimeout(() => scheduleTick(), speed);
    }

    moveTimer = setTimeout(() => scheduleTick(), speed);

    compCollector.on("end", (_collected, reason) => {
      if (gameActive && reason !== "ended") {
        gameActive = false;
        if (moveTimer) clearTimeout(moveTimer);
        if (cfg.hasLeaderboard) saveLeaderboardLocal().catch(() => {});
        gameMessage.delete().catch(() => {});
      }
    });
  }
};
