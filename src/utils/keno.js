const {
  MessageEmbed,
  MessageActionRow,
  MessageSelectMenu,
} = require("discord.js");

const emojis = require("../emoji.json");

function chooseEmoji(amount) {
  if (amount > 100000) return emojis.money?.high || "💰";
  if (amount > 10000) return emojis.money?.medium || "💵";
  return emojis.money?.low || "🪙";
}

function getBalance(client, userId) {
  return client.eco.fetchMoney(userId).then((b) =>
    typeof b === "object" && b != null && b.amount != null ? Number(b.amount) : Number(b) || 0
  );
}

const SUCC = (emojis.bot && emojis.bot.succes) || "✅";
const ERR = (emojis.bot && emojis.bot.error) || "❌";

exports.execute = async (client, message) => {
  const userId = message.author.id;
  const displayName = message.member?.displayName || message.author.username;

  let balance = await getBalance(client, userId);
  const balanceEmoji = chooseEmoji(balance);

  if (balance < 10) {
    return message.channel.send(
      `${ERR} **${displayName}**, oynamak için en az 10 ${chooseEmoji(10)} gerekiyor~ Biraz daha biriktir sonra gel nyaa~`
    );
  }

  const embed = new MessageEmbed()
    .setTitle(`${SUCC} 🎲 Keno Bahis`)
    .setDescription(
      `Ne kadar bahis yapmak istiyorsun? 💰\n\nMevcut paran: **${balance.toLocaleString()}** ${balanceEmoji}\n\n` +
      `⏳ Seçim için süre var. Min: 10 • Max: 250.000 • Ya da All ile tüm bakiyeni kullanabilirsin.`
    )
    .setColor("GOLD");

  const row = new MessageActionRow().addComponents(
    new MessageSelectMenu()
      .setCustomId("bet_amount")
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
    embeds: [embed],
    components: [row],
  });

  const filter = (i) => i.user.id === userId && i.customId === "bet_amount";

  let selectionInteraction;
  let betAmount;

  while (true) {
    try {
      selectionInteraction = await menuMsg.awaitMessageComponent({
        filter,
        componentType: "SELECT_MENU",
        time: 60000,
      });
      await selectionInteraction.deferUpdate();

      const choice = selectionInteraction.values[0];
      balance = await getBalance(client, userId);
      betAmount = choice === "all" ? Math.min(balance, 250000) : parseInt(choice, 10);

      if (isNaN(betAmount) || betAmount < 10 || betAmount > 250000) {
        await selectionInteraction.followUp({
          content: `${ERR} **${displayName}**, geçersiz bahis seçtin~ Lütfen 10 ile 250.000 arasında bir değer seç, tamam mı~`,
          ephemeral: true,
        });
        continue;
      }

      if (betAmount > balance) {
        await selectionInteraction.followUp({
          content: `${ERR} **${displayName}**, yeterli bakiye yok~ Bahis menüsünü tekrar açıyorum, lütfen yeniden seç owo~`,
          ephemeral: true,
        });
        continue;
      }

      break;
    } catch (err) {
      await menuMsg.edit({
        content: `${ERR} ⏳ Süre doldu~ Bahis seçilmedi, istersen tekrar deneyebilirsin~`,
        embeds: [],
        components: [],
      });
      return;
    }
  }

  await client.eco.removeMoney(userId, betAmount);
  const betEmoji = chooseEmoji(betAmount);

  const kenoEmbed = new MessageEmbed()
    .setTitle(`${SUCC} 🎲 Keno Sayıları Seç`)
    .setDescription(
      `Bahis: **${betAmount.toLocaleString()}** ${betEmoji}\n\n` +
      "1–80 arasında en fazla **10** sayı seçip boşlukla ayır.\nÖrnek: `3 15 27 80`\n\n" +
      "**Kazanç:**\n- 1–3 eşleşme: 2×\n- 4–6 eşleşme: 5×\n- 7–9 eşleşme: 10×\n- 10 eşleşme: 100×"
    )
    .setColor("GOLD");

  await selectionInteraction.followUp({ embeds: [kenoEmbed] });

  const numberCollector = message.channel.createMessageCollector({
    filter: (m) => m.author.id === userId,
    time: 30000,
    max: 1,
  });

  numberCollector.on("collect", async (numberMsg) => {
    const selected = numberMsg.content
      .split(/\s+/)
      .map((n) => parseInt(n, 10))
      .filter((n) => Number.isInteger(n) && n >= 1 && n <= 80);

    if (selected.length === 0 || selected.length > 10) {
      return numberMsg.reply(
        `${ERR} **${displayName}**, hatalı seçim! 1–80 arasında ve en fazla 10 sayı seçmelisin~`
      );
    }
    numberCollector.stop();

    const drawn = [];
    while (drawn.length < 20) {
      const n = Math.floor(Math.random() * 80) + 1;
      if (!drawn.includes(n)) drawn.push(n);
    }

    const matched = selected.filter((n) => drawn.includes(n));
    let winnings = 0;
    if (matched.length === 0) winnings = 0;
    else if (matched.length <= 3) winnings = betAmount * 2;
    else if (matched.length <= 6) winnings = betAmount * 5;
    else if (matched.length <= 9) winnings = betAmount * 10;
    else if (matched.length === 10) winnings = betAmount * 100;

    if (winnings > 0) {
      await client.eco.addMoney(userId, winnings);
    }

    const winEmoji = chooseEmoji(winnings);

    const resultEmbed = new MessageEmbed()
      .setTitle(winnings > 0 ? `${SUCC} 🎲 Keno Sonuç` : `${ERR} 🎲 Keno Sonuç`)
      .setDescription(
        `**Çekilen:** ${drawn.join(", ")}\n` +
        `**Seçilen:** ${selected.join(", ")}\n` +
        `**Eşleşen:** ${matched.join(", ") || "–"}\n\n` +
        `💰 **Kazanç:** ${winnings.toLocaleString()} ${winEmoji}`
      )
      .setColor(winnings > 0 ? "GREEN" : "RED");

    await numberMsg.reply({ embeds: [resultEmbed] });
  });

  numberCollector.on("end", (collected, reason) => {
    if (reason === "time" && collected.size === 0) {
      message.channel.send(
        `${ERR} ⏳ **${displayName}**, süre doldu! Sayı seçilmedi, oyun iptal edildi~`
      );
    }
  });
};
