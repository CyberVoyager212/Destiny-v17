const {
  MessageEmbed,
  MessageActionRow,
  MessageSelectMenu,
  MessageButton,
} = require("discord.js");

const emojis = require("../emoji.json");

function chooseEmoji(amount) {
  if (amount > 100000) return emojis.money.high;
  if (amount > 10000) return emojis.money.medium;
  return emojis.money.low;
}

exports.execute = async (client, message) => {
  const userId = message.author.id;
  const displayName = message.member?.displayName || message.author.username;

  const balance = await client.eco.fetchMoney(userId);
  const balanceEmoji = chooseEmoji(balance);

  if (balance < 10) {
    return message.reply(
      `${emojis.bot.error} | **${displayName}**, oynamak için en az 10 ${chooseEmoji(10)} gerekiyor~ Biraz daha biriktir, tamam mı? :c`
    );
  }

  const betEmbed = new MessageEmbed()
    .setTitle(`${emojis.bot.succes} | 🎲 Baccarat Bahis`)
    .setDescription(
      `Mevcut bakiyen: **${balance.toLocaleString()}** ${balanceEmoji}\n\n` +
      "Lütfen bahis miktarını seç (min: 10 • max: 250.000 veya **All**):"
    )
    .setColor("GOLD");

  const betRow = new MessageActionRow().addComponents(
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

  const betMsg = await message.channel.send({
    embeds: [betEmbed],
    components: [betRow],
  });

  async function promptBet() {
    const overallTimeout = Date.now() + 3 * 60 * 1000;
    let attemptTimeout = 30000;

    while (Date.now() < overallTimeout) {
      try {
        const collected = await betMsg.awaitMessageComponent({
          filter: (i) => i.user.id === userId && i.customId === "bet_amount",
          componentType: "SELECT_MENU",
          time: attemptTimeout,
        });

        await collected.deferUpdate();

        const choice = collected.values[0];
        const betAmount = choice === "all" ? Math.min(balance, 250000) : parseInt(choice, 10);

        if (isNaN(betAmount) || betAmount < 10 || betAmount > 250000) {
          await collected.followUp({
            content: `${emojis.bot.error} | **${displayName}**, geçersiz bahis! Lütfen 10 ile 250.000 arasında bir değer seç, tamam mı~? Yeniden seçeneğini açıyorum, sakince seçebilirsin~`,
            ephemeral: true,
          });
          attemptTimeout = 60000;
          continue;
        }

        if (betAmount > balance) {
          await collected.followUp({
            content: `${emojis.bot.error} | **${displayName}**, bakiye yetmiyor~ Bu seçimi yapabilmek için yeterli para yok. Daha küçük bir bahis seç ya da \"All\" ile kalanını kullanmayı dene~ Menüyü uzattım, tekrar seçebilirsin nyaa~`,
            ephemeral: true,
          });
          attemptTimeout = 60000;
          continue;
        }

        return betAmount;
      } catch (err) {
        return null;
      }
    }
    return null;
  }

  const betAmount = await promptBet();

  if (!betAmount) {
    return betMsg.edit({
      content: `${emojis.bot.error} | ⏳ | **${displayName}**, süre doldu veya seçim yapılmadı~ Oyun iptal edildi, yine beklerim, tamam mı?`,
      embeds: [],
      components: [],
    });
  }

  await client.eco.removeMoney(userId, betAmount);
  const betEmoji = chooseEmoji(betAmount);

  const buttonRow = new MessageActionRow().addComponents(
    new MessageButton()
      .setCustomId("player")
      .setLabel("🟦 Oyuncuya Bahis")
      .setStyle("PRIMARY"),
    new MessageButton()
      .setCustomId("banker")
      .setLabel("🟥 Bankere Bahis")
      .setStyle("DANGER"),
    new MessageButton()
      .setCustomId("tie")
      .setLabel("🟩 Beraberlik")
      .setStyle("SUCCESS")
  );

  const choiceEmbed = new MessageEmbed()
    .setTitle(`${emojis.bot.succes} | 🎲 Baccarat Bahis Seçimi`)
    .setDescription(
      `Bahis miktarı: **${betAmount.toLocaleString()}** ${betEmoji}\n\n` +
      "🟦 **Oyuncu** (2×)\n" +
      "🟥 **Banker** (1.95×, %5 komisyon)\n" +
      "🟩 **Beraberlik** (8×)"
    )
    .setColor("GOLD");

  const choiceMsg = await message.channel.send({ embeds: [choiceEmbed], components: [buttonRow] });

  try {
    const btnInt = await choiceMsg.awaitMessageComponent({
      filter: (btn) => btn.user.id === userId && btn.customId,
      componentType: "BUTTON",
      time: 30000,
    });

    await btnInt.deferUpdate();
    const betChoice = btnInt.customId;

    const deck = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
    const getCardValue = (c) => {
      if (c === "A") return 1;
      if (["10", "J", "Q", "K"].includes(c)) return 0;
      return parseInt(c);
    };
    const draw = () => deck[Math.floor(Math.random() * deck.length)];

    const playerCards = [draw(), draw()];
    const bankerCards = [draw(), draw()];
    const playerScore = (getCardValue(playerCards[0]) + getCardValue(playerCards[1])) % 10;
    const bankerScore = (getCardValue(bankerCards[0]) + getCardValue(bankerCards[1])) % 10;

    let resultText = "";
    let winnings = 0;
    if (playerScore > bankerScore) {
      resultText = "**🟦 Oyuncu kazandı!**";
      if (betChoice === "player") winnings = Math.floor(betAmount * 2);
    } else if (bankerScore > playerScore) {
      resultText = "**🟥 Banker kazandı!**";
      if (betChoice === "banker") winnings = Math.floor(betAmount * 1.95);
    } else {
      resultText = "**🟩 Beraberlik!**";
      if (betChoice === "tie") winnings = Math.floor(betAmount * 8);
    }

    if (winnings > 0) {
      await client.eco.addMoney(userId, winnings);
    }

    const winEmoji = chooseEmoji(winnings);
    const resultEmbed = new MessageEmbed()
      .setTitle(
        winnings > 0 ? `${emojis.bot.succes} | 🎲 Baccarat Sonuç` : `${emojis.bot.error} | 🎲 Baccarat Sonuç`
      )
      .setDescription(
        `${resultText}\n\n` +
        `🟦 Oyuncu: ${playerCards.join(" - ")} (**${playerScore}**)\n` +
        `🟥 Banker: ${bankerCards.join(" - ")} (**${bankerScore}**)\n\n` +
        `💰 Kazanç: **${winnings.toLocaleString()}** ${winEmoji}`
      )
      .setColor(winnings > 0 ? "GREEN" : "RED");

    await btnInt.editReply({ embeds: [resultEmbed], components: [] });
  } catch (err) {
    return choiceMsg.edit({
      content: `${emojis.bot.error} | **${displayName}**, biraz hızlısın nyaa~ Süre doldu, seçim yapılmadı. Oyun iptal edildi, tekrar dener misin?`,
      embeds: [],
      components: [],
    });
  }
};
