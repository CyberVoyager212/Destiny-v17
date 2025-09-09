// Discord.js v13
const { MessageActionRow, MessageButton, MessageEmbed } = require("discord.js");
let emojis;
try {
  emojis = require("../emoji.json");
} catch (e) {
  emojis = { bot: { succes: "✅", error: "❌" } };
}

const editState = new WeakMap();
async function safeEdit(message, payload, opts = {}) {
  const minInterval = opts.minInterval ?? 150;
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
          console.error("safeEdit hata:", err);
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
      console.error("safeEdit hata:", err);
    }
  }
}

exports.help = {
  name: "snake",
  description: "Yılan oyunu başlatır. Önce mod seçilir, sonra (gerekirse) zorluk seçilir.",
  usage: "snake",
  category: "Eğlence",
  cooldown: 5,
};

exports.execute = async (client, message, args = []) => {
  const playerId = message.author.id;
  const gridSize = 11;
  const inactivityLimit = 60_000;
  const modes = [
    { id: "mode_classic", key: "klasik", label: "Klasik" },
    { id: "mode_bloklu", key: "bloklu", label: "Bloklu" },
    { id: "mode_endless", key: "endless", label: "Endless (Sonsuz)" },
    { id: "mode_ai", key: "ai", label: "Yapay Zeka (AI)" },
  ];
  const difficulties = [
    { id: "diff_easy", key: "easy", label: "Kolay" },
    { id: "diff_normal", key: "normal", label: "Orta" },
    { id: "diff_hard", key: "hard", label: "Zor" },
  ];

  const modeEmbed = new MessageEmbed()
    .setTitle("🐍 Yılan - Mod Seçimi")
    .setDescription("Bir oyun modu seçin:")
    .setColor("#FFD700")
    .setFooter({ text: `${message.member.displayName} için seçim yapın` });

  const modeRow = new MessageActionRow().addComponents(
    modes.map((m) =>
      new MessageButton().setCustomId(m.id).setLabel(m.label).setStyle("PRIMARY")
    )
  );
  const cancelRow = new MessageActionRow().addComponents(
    new MessageButton().setCustomId("mode_cancel").setLabel("İptal").setStyle("DANGER")
  );

  const modeMsg = await message.channel.send({ embeds: [modeEmbed], components: [modeRow, cancelRow] });

  const modeFilter = (i) => i.user.id === playerId && i.message.id === modeMsg.id;
  const modeCollector = modeMsg.createMessageComponentCollector({ filter: modeFilter, time: 30_000, max: 1 });

  modeCollector.on("collect", async (int) => {
    try {
      if (int.customId === "mode_cancel") {
        await int.update({ content: `${emojis.bot.succes} | İşlem iptal edildi.`, embeds: [], components: [] });
        return;
      }
      const chosenMode = modes.find((m) => m.id === int.customId);
      if (!chosenMode)
        return await int.update({ content: `${emojis.bot.error} | **${message.member.displayName}**, seçtiğin mod anlaşılamadı :c`, embeds: [], components: [] });

      if (chosenMode.key === "endless" || chosenMode.key === "ai") {
        await int.update({ content: `${emojis.bot.succes} | ${chosenMode.label} başlatılıyor... hazırsan başlıyoruz~`, embeds: [], components: [] });
        setTimeout(() => startGame(client, message, chosenMode.key, chosenMode.key === "ai" ? "ai" : "normal"), 400);
        return;
      }

      const diffEmbed = new MessageEmbed().setTitle(`⚙️ Zorluk — ${chosenMode.label}`).setDescription("Zorluk seçin:").setColor("#87CEEB");
      const diffRow = new MessageActionRow().addComponents(
        difficulties.map((d) => new MessageButton().setCustomId(d.id).setLabel(d.label).setStyle("SECONDARY"))
      );
      const backRow = new MessageActionRow().addComponents(
        new MessageButton().setCustomId("diff_back").setLabel("Geri").setStyle("DANGER")
      );

      await int.update({ embeds: [diffEmbed], components: [diffRow, backRow] });

      const diffFilter = (i2) => i2.user.id === playerId && i2.message.id === modeMsg.id;
      const diffCollector = modeMsg.createMessageComponentCollector({ filter: diffFilter, time: 30_000, max: 1 });

      diffCollector.on("collect", async (i2) => {
        try {
          if (i2.customId === "diff_back") {
            await i2.update({ embeds: [modeEmbed], components: [modeRow, cancelRow] });
            return;
          }
          const chosenDiff = difficulties.find((d) => d.id === i2.customId);
          if (!chosenDiff)
            return await i2.update({ content: `${emojis.bot.error} | **${message.member.displayName}**, bu zorluk listede yok gibi görünüyor :c`, embeds: [], components: [] });

          await i2.update({ content: `${emojis.bot.succes} | ${chosenMode.label} • ${chosenDiff.label} başlatılıyor... eğlenceli olsun~`, embeds: [], components: [] });
          setTimeout(() => startGame(client, message, chosenMode.key, chosenDiff.key), 400);
        } catch (err) {
          console.error("diff collect hata:", err);
          try {
            await i2.update({ content: `${emojis.bot.error} | Bir şeyler ters gitti... üzgünüm :c`, embeds: [], components: [] });
          } catch {}
        }
      });

      diffCollector.on("end", (collected) => {
        if (collected.size === 0) {
          modeMsg.edit({ content: `${emojis.bot.error} | ⏱ | **${message.member.displayName}**, zaman doldu — zorluk seçilmedi :c`, embeds: [], components: [] }).catch(() => {});
        }
      });
    } catch (err) {
      console.error("mode collect hata:", err);
      try {
        await int.update({ content: `${emojis.bot.error} | Hata oluştu... lütfen tekrar dene :c`, embeds: [], components: [] });
      } catch {}
    }
  });

  modeCollector.on("end", (collected) => {
    if (collected.size === 0)
      modeMsg.edit({ content: `${emojis.bot.error} | ⏱ | **${message.member.displayName}**, zaman doldu — mod seçilmedi :c`, embeds: [], components: [] }).catch(() => {});
  });

  async function startGame(client, triggerMessage, modeKey, difficultyKey) {
    const diffs = {
      easy: { baseSpeed: 700, speedStep: 8, blocksEvery: 6, startBlocks: 0, minEdit: 260 },
      normal: { baseSpeed: 500, speedStep: 15, blocksEvery: 5, startBlocks: 0, minEdit: 180 },
      hard: { baseSpeed: 350, speedStep: 25, blocksEvery: 4, startBlocks: 1, minEdit: 120 },
      ai: { baseSpeed: 250, speedStep: 12, blocksEvery: 5, startBlocks: 1, minEdit: 150 },
    };
    const cfgDiff = diffs[difficultyKey] || diffs.normal;

    const modeCfg = {
      klasik: { allowBlocks: false, wrap: false, extraStartBlocks: 0, hasLeaderboard: true },
      bloklu: { allowBlocks: true, wrap: false, extraStartBlocks: 0, hasLeaderboard: true },
      endless: { allowBlocks: false, wrap: true, extraStartBlocks: 0, hasLeaderboard: true },
      ai: { allowBlocks: true, wrap: false, extraStartBlocks: 1, hasLeaderboard: false },
    }[modeKey] || { allowBlocks: false, wrap: false, extraStartBlocks: 0, hasLeaderboard: true };

    const cfg = {
      gridSize,
      baseSpeed: cfgDiff.baseSpeed,
      speedStep: cfgDiff.speedStep,
      blocksEvery: cfgDiff.blocksEvery,
      startBlocks: (cfgDiff.startBlocks || 0) + (modeCfg.extraStartBlocks || 0),
      allowBlocks: modeCfg.allowBlocks,
      wrap: modeCfg.wrap,
      minEditInterval: cfgDiff.minEdit,
      hasLeaderboard: modeCfg.hasLeaderboard,
    };

    let snake = [{ x: Math.floor(cfg.gridSize / 2), y: Math.floor(cfg.gridSize / 2) }];
    let direction = "RIGHT";
    let food = { x: -1, y: -1 };
    let score = 0;
    let apples = 0;
    let blocks = [];
    let gameActive = true;
    let speed = cfg.baseSpeed;
    let lastInteraction = Date.now();
    const startTime = Date.now();
    const isAI = modeKey === "ai";

    const leaderboardKey = `snake-leaderboard-${triggerMessage.guild.id}-${modeKey}-${difficultyKey}`;
    let leaderboard = (await client.db.get(leaderboardKey)) || [];

    function saveLeaderboardLocal() {
      if (!cfg.hasLeaderboard) return Promise.resolve();
      const name = (triggerMessage.member && triggerMessage.member.displayName) || triggerMessage.author.username;
      leaderboard.push({ name, score, time: Math.round((Date.now() - startTime) / 1000) });
      leaderboard.sort((a, b) => b.score - a.score || a.time - b.time);
      leaderboard = leaderboard.slice(0, 50);
      return client.db.set(leaderboardKey, leaderboard).catch(() => {});
    }

    function occupiedSet() {
      const set = new Set();
      snake.forEach((s) => set.add(`${s.x},${s.y}`));
      blocks.forEach((b) => set.add(`${b.x},${b.y}`));
      if (food.x >= 0) set.add(`${food.x},${food.y}`);
      return set;
    }

    function placeFood() {
      const occ = occupiedSet();
      if (occ.size >= cfg.gridSize * cfg.gridSize) {
        food = { x: -1, y: -1 };
        return null;
      }
      let fx, fy;
      let attempts = 0;
      do {
        fx = Math.floor(Math.random() * cfg.gridSize);
        fy = Math.floor(Math.random() * cfg.gridSize);
        attempts++;
        if (attempts > 1000) return null;
      } while (occ.has(`${fx},${fy}`));
      food = { x: fx, y: fy };
      return food;
    }

    function addBlockRandom() {
      if (!cfg.allowBlocks) return false;
      const occ = occupiedSet();
      if (occ.size >= cfg.gridSize * cfg.gridSize) return false;
      let bx, by;
      let attempts = 0;
      do {
        bx = Math.floor(Math.random() * cfg.gridSize);
        by = Math.floor(Math.random() * cfg.gridSize);
        attempts++;
        if (attempts > 1000) return false;
      } while (occ.has(`${bx},${by}`));
      blocks.push({ x: bx, y: by });
      return true;
    }

    for (let i = 0; i < cfg.startBlocks; i++) addBlockRandom();
    placeFood();

    function renderGrid() {
      let s = "";
      for (let y = 0; y < cfg.gridSize; y++) {
        for (let x = 0; x < cfg.gridSize; x++) {
          if (x === snake[0].x && y === snake[0].y) s += "🟩";
          else if (snake.slice(1).some((seg) => seg.x === x && seg.y === y)) s += "🟨";
          else if (food.x === x && food.y === y) s += "🍏";
          else if (blocks.some((b) => b.x === x && b.y === y)) s += "🧱";
          else s += "⬛";
        }
        s += "\n";
      }
      return s;
    }

    function baseEmbed() {
      return new MessageEmbed()
        .setTitle(`🐍 ${modeKey.toUpperCase()} • ${difficultyKey.toUpperCase()}`)
        .setDescription(`${emojis.bot.succes} | Puan: **${score}** • Elma: **${apples}**\n\n${renderGrid()}`)
        .setFooter({ text: `${(triggerMessage.member && triggerMessage.member.displayName) || triggerMessage.author.username} • Hız: ${Math.max(1, Math.round((1000 / speed) * 10) / 10)}` })
        .setColor("#00FF00");
    }

    const controls = new MessageActionRow().addComponents(
      new MessageButton().setCustomId("g_up").setLabel("⬆️").setStyle("PRIMARY"),
      new MessageButton().setCustomId("g_down").setLabel("⬇️").setStyle("PRIMARY"),
      new MessageButton().setCustomId("g_left").setLabel("⬅️").setStyle("PRIMARY"),
      new MessageButton().setCustomId("g_right").setLabel("➡️").setStyle("PRIMARY"),
      new MessageButton().setCustomId("g_quit").setLabel("❌ Çık").setStyle("DANGER")
    );

    const gameMessage = await triggerMessage.channel.send({ embeds: [baseEmbed()], components: [controls] });

    const filter = (i) => (isAI ? i.user.id === playerId : i.user.id === playerId) && i.message.id === gameMessage.id;
    const collector = gameMessage.createMessageComponentCollector({ filter, time: 1000 * 60 * 20 });

    collector.on("collect", async (interaction) => {
      lastInteraction = Date.now();
      try {
        if (interaction.customId === "g_quit") {
          await interaction.update({ content: `${emojis.bot.succes} | Oyun iptal edildi.`, embeds: [], components: [] }).catch(() => {});
          gameActive = false;
          collector.stop("quit");
          setTimeout(() => gameMessage.delete().catch(() => {}), 500);
          return;
        }

        if (!isAI) {
          if (interaction.customId === "g_up" && direction !== "DOWN") direction = "UP";
          if (interaction.customId === "g_down" && direction !== "UP") direction = "DOWN";
          if (interaction.customId === "g_left" && direction !== "RIGHT") direction = "LEFT";
          if (interaction.customId === "g_right" && direction !== "LEFT") direction = "RIGHT";
          await interaction.deferUpdate().catch(() => {});
        } else {
          await interaction.deferUpdate().catch(() => {});
        }
      } catch (err) {
        console.error("collector collect hata:", err);
        try {
          await interaction.deferUpdate().catch(() => {});
        } catch {}
      }
    });

    function moveOnceAI(aiMode = false) {
      if (aiMode) {
        const head = { ...snake[0] };
        const candidates = [];
        const tries = [
          { d: "UP", x: head.x, y: head.y - 1 },
          { d: "DOWN", x: head.x, y: head.y + 1 },
          { d: "LEFT", x: head.x - 1, y: head.y },
          { d: "RIGHT", x: head.x + 1, y: head.y },
        ];
        for (const t of tries) {
          let nx = t.x, ny = t.y;
          if (cfg.wrap) {
            if (nx < 0) nx = cfg.gridSize - 1;
            if (nx >= cfg.gridSize) nx = 0;
            if (ny < 0) ny = cfg.gridSize - 1;
            if (ny >= cfg.gridSize) ny = 0;
          }
          const wouldHitBody = snake.some((seg) => seg.x === nx && seg.y === ny);
          const wouldHitBlock = blocks.some((b) => b.x === nx && b.y === ny);
          const outOfBounds = !cfg.wrap && (nx < 0 || nx >= cfg.gridSize || ny < 0 || ny >= cfg.gridSize);
          if (wouldHitBody || wouldHitBlock || outOfBounds) continue;
          const scoreDist = food.x >= 0 ? Math.abs(nx - food.x) + Math.abs(ny - food.y) : Math.random() * 100;
          candidates.push({ dir: t.d, nx, ny, dist: scoreDist });
        }
        if (candidates.length === 0) {
          const t = tries[Math.floor(Math.random() * tries.length)];
          direction = t.d;
        } else {
          candidates.sort((a, b) => a.dist - b.dist);
          const pick = Math.random() < 0.85 ? candidates[0] : candidates[Math.floor(Math.random() * candidates.length)];
          direction = pick.dir;
        }
      }

      let newHead = { ...snake[0] };
      if (direction === "UP") newHead.y -= 1;
      else if (direction === "DOWN") newHead.y += 1;
      else if (direction === "LEFT") newHead.x -= 1;
      else newHead.x += 1;

      if (cfg.wrap) {
        if (newHead.x < 0) newHead.x = cfg.gridSize - 1;
        if (newHead.x >= cfg.gridSize) newHead.x = 0;
        if (newHead.y < 0) newHead.y = cfg.gridSize - 1;
        if (newHead.y >= cfg.gridSize) newHead.y = 0;
      }

      snake.unshift(newHead);

      if (newHead.x === food.x && newHead.y === food.y) {
        score += 10;
        apples++;
        placeFood();
        speed = Math.max(80, speed - cfg.speedStep);
        if (cfg.allowBlocks && apples % cfg.blocksEvery === 0) addBlockRandom();
      } else {
        snake.pop();
      }

      if (!cfg.wrap && (newHead.x < 0 || newHead.x >= cfg.gridSize || newHead.y < 0 || newHead.y >= cfg.gridSize)) {
        return { lost: true, reason: "Duvara çarptı." };
      }
      if (snake.slice(1).some((s) => s.x === newHead.x && s.y === newHead.y)) {
        return { lost: true, reason: "Kendine çarptı." };
      }
      if (blocks.some((b) => b.x === newHead.x && b.y === newHead.y)) {
        return { lost: true, reason: "Bloka çarptı." };
      }
      return { lost: false };
    }

    async function endGame(reason) {
      gameActive = false;
      if (cfg.hasLeaderboard) {
        try { await saveLeaderboardLocal(); } catch (e) { console.error("leaderboard kaydetme hata:", e); }
      }

      const displayName = (triggerMessage.member && triggerMessage.member.displayName) || triggerMessage.author.username;
      const finalReason = typeof reason === 'string' && reason.startsWith(emojis.bot.error) ? reason : `${emojis.bot.error} | **${displayName}**, ${reason}`;

      const endEmbed = new MessageEmbed()
        .setTitle("🎮 Oyun Bitti!")
        .setDescription(`Puanınız: **${score}**\nSebep: ${finalReason}`)
        .setColor("#FF0000")
        .setFooter({ text: `Elma: ${apples} • Süre: ${Math.round((Date.now() - startTime) / 1000)}s` });

      await safeEdit(gameMessage, { embeds: [endEmbed], components: [] }, { minInterval: cfg.minEditInterval }).catch(() => {});

      if (cfg.hasLeaderboard) {
        setTimeout(async () => {
          const lb = (await client.db.get(leaderboardKey)) || leaderboard || [];
          const top = lb.slice(0, 10);
          const lbEmbed = new MessageEmbed()
            .setTitle(`🏅 Liderlik • ${modeKey.toUpperCase()} • ${difficultyKey.toUpperCase()}`)
            .setColor("#FFD700")
            .setDescription(top.length ? top.map((e, i) => `${i + 1}. **${e.name}** — ${e.score} puan (${e.time}s)`).join("\n") : "Liderlik tablosu boş.");
          await triggerMessage.channel.send({ embeds: [lbEmbed] }).catch(() => {});
          await gameMessage.delete().catch(() => {});
        }, 800);
      } else {
        setTimeout(() => gameMessage.delete().catch(() => {}), 1000);
      }

      collector.stop("ended");
    }

    let moveTimer = null;
    async function scheduleMove() {
      if (!gameActive) return;

      const res = moveOnceAI(isAI);
      if (res.lost) {
        await endGame(res.reason);
        return;
      }

      if (!isAI && Date.now() - lastInteraction > inactivityLimit) {
        await endGame(`⏱ | **${(triggerMessage.member && triggerMessage.member.displayName) || triggerMessage.author.username}**, lütfen biraz yavaş ol~ bana göre çok hızlısın :c`);
        return;
      }

      if (isAI && (food.x < 0 || food.y < 0)) {
        await endGame(`${emojis.bot.error} | Artık boş yer kalmadı — AI modu bitti.`);
        return;
      }

      await safeEdit(gameMessage, { embeds: [baseEmbed()], components: [controls] }, { minInterval: cfg.minEditInterval }).catch(() => {});

      moveTimer = setTimeout(() => scheduleMove(), speed);
    }

    moveTimer = setTimeout(() => scheduleMove(), speed);

    collector.on("end", (_collected, reason) => {
      if (gameActive && reason !== "ended") {
        gameActive = false;
        if (moveTimer) clearTimeout(moveTimer);
        if (cfg.hasLeaderboard) saveLeaderboardLocal().catch(() => {});
        gameMessage.delete().catch(() => {});
      }
    });
  }
};
