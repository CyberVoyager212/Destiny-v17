const {
  MessageEmbed,
  MessageActionRow,
  MessageSelectMenu,
  MessageButton,
} = require("discord.js");

const emojis = require("../emoji.json");

function chooseEmoji(amount) {
  if (amount > 100000) return emojis.money?.high || "💰";
  if (amount > 10000) return emojis.money?.medium || "💵";
  return emojis.money?.low || "🪙";
}

async function getBalance(client, userId) {
  const b = await client.eco.fetchMoney(userId);
  return typeof b === "object" && b != null && b.amount != null
    ? Number(b.amount)
    : Number(b) || 0;
}

const SUCC = (emojis.bot && emojis.bot.succes) || "✅";
const ERR = (emojis.bot && emojis.bot.error) || "❌";

exports.execute = async (client, message) => {
  const userId = message.author.id;
  const displayName = message.member?.displayName || message.author.username;

  let balance = await getBalance(client, userId);
  if (balance < 10) {
    return message.channel.send(
      `${ERR} **${displayName}**, oynamak için en az 10 ${chooseEmoji(10)} gerekiyor~ Biraz daha biriktir, sonra gel nyaa~`
    );
  }

  const embed = new MessageEmbed()
    .setTitle(`${SUCC} 🎲 Craps Oyunu`)
    .setDescription(
      `Mevcut bakiyen: **${balance.toLocaleString()}** ${chooseEmoji(balance)}\n\n` +
      "Lütfen bahis miktarını seç: (min: 10 • max: 250.000 • veya All)"
    )
    .setColor("BLUE");

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
          content: `${ERR} **${displayName}**, geçersiz bahis! Lütfen 10 ile 250.000 arasında bir değer seç, tamam mı~`,
          ephemeral: true,
        });
        continue;
      }

      if (betAmount > balance) {
        await selectionInteraction.followUp({
          content: `${ERR} **${displayName}**, yeterli bakiye yok~ Bahis menüsünü tekrar açıyorum, lütfen daha düşük bir miktar seç owo~`,
          ephemeral: true,
        });
        continue;
      }

      break;
    } catch (err) {
      await menuMsg.edit({
        content: `${ERR} ⏱ **${displayName}**, lütfen biraz yavaş ol~ bana göre çok hızlısın :c Süre doldu, bahis seçimi iptal edildi.`,
        embeds: [],
        components: [],
      });
      return;
    }
  }

  await client.eco.removeMoney(userId, betAmount);
  const betEmoji = chooseEmoji(betAmount);

  const gameEmbed = new MessageEmbed()
    .setTitle(`${SUCC} 🎲 Craps Oyunu`)
    .setDescription(
      `İlk zar atılıyor!\nBahis: **${betAmount.toLocaleString()}** ${betEmoji}\n\n` +
      "“Zar At” butonuna bas!"
    )
    .setColor("BLUE");

  const gameRow = new MessageActionRow().addComponents(
    new MessageButton().setCustomId("roll").setLabel("🎲 Zar At").setStyle("PRIMARY"),
    new MessageButton().setCustomId("leave").setLabel("🏃 Çekil").setStyle("SECONDARY")
  );

  const gameMessage = await selectionInteraction.followUp({
    embeds: [gameEmbed],
    components: [gameRow],
    fetchReply: true,
  });

  let point = null;
  let gameOver = false;

  const gameCollector = gameMessage.createMessageComponentCollector({
    filter: (i) => i.user.id === userId,
    componentType: "BUTTON",
    time: 60000,
  });

  gameCollector.on("collect", async (gameInteraction) => {
    const { customId } = gameInteraction;

    if (customId === "leave") {
      gameCollector.stop();
      await client.eco.addMoney(userId, betAmount);
      return gameInteraction.update({
        content: `${SUCC} **${displayName}**, oyundan çekildin~ Bahisin iade edildi: **${betAmount.toLocaleString()}** ${betEmoji}`,
        embeds: [],
        components: [],
      });
    }

    await gameInteraction.deferUpdate();
    if (gameOver) return;

    const dice1 = Math.floor(Math.random() * 6) + 1;
    const dice2 = Math.floor(Math.random() * 6) + 1;
    const roll = dice1 + dice2;

    if (point === null) {
      if (roll === 7 || roll === 11) {
        gameOver = true;
        await client.eco.addMoney(userId, betAmount * 2);
        return gameInteraction.editReply({
          content: `${SUCC} 🎉 **Kazandın!** Zar: **${dice1}+${dice2}=${roll}**\nKazanç: **${(betAmount * 2).toLocaleString()}** ${chooseEmoji(
            betAmount * 2
          )} Tebrikler~`,
          embeds: [],
          components: [],
        });
      }
      if ([2, 3, 12].includes(roll)) {
        gameOver = true;
        return gameInteraction.editReply({
          content: `${ERR} 💀 **Kaybettin!** Zar: **${dice1}+${dice2}=${roll}**\nKaybedilen bahis: **${betAmount.toLocaleString()}** ${betEmoji} Üzgünüm~ :c`,
          embeds: [],
          components: [],
        });
      }
      point = roll;
      return gameInteraction.editReply({
        embeds: [
          new MessageEmbed()
            .setTitle("🎯 Point Belirlendi")
            .setDescription(
              `Point: **${point}**\nŞimdi **${point}** atarsan kazanırsın, **7** atarsan kaybedersin!`
            )
            .setColor("GOLD"),
        ],
        components: [gameRow],
      });
    }

    if (roll === point) {
      gameOver = true;
      await client.eco.addMoney(userId, betAmount * 2);
      return gameInteraction.editReply({
        content: `${SUCC} 🎉 **Point'i tutturdun!** Zar: **${dice1}+${dice2}=${roll}**\nKazanç: **${(betAmount * 2).toLocaleString()}** ${chooseEmoji(
          betAmount * 2
        )} Süpersin~`,
        embeds: [],
        components: [],
      });
    }

    if (roll === 7) {
      gameOver = true;
      return gameInteraction.editReply({
        content: `${ERR} 💀 **7 geldi! Kaybettin!** Zar: **${dice1}+${dice2}=${roll}**\nKaybedilen bahis: **${betAmount.toLocaleString()}** ${betEmoji} Üzgünüm~`,
        embeds: [],
        components: [],
      });
    }

    return gameInteraction.editReply({
      embeds: [
        new MessageEmbed()
          .setTitle("🎲 Zar Atıldı")
          .setDescription(
            `Zar: **${dice1}+${dice2}=${roll}**\nHedef: **${point}** — Devam etmek için tekrar "Zar At".`
          )
          .setColor("YELLOW"),
      ],
      components: [gameRow],
    });
  });

  gameCollector.on("end", async (_, reason) => {
    if (reason === "time" && !gameOver) {
      await client.eco.addMoney(userId, betAmount);
      gameMessage.edit({
        content: `${ERR} ⏱ **${displayName}**, lütfen biraz yavaş ol~ bana göre çok hızlısın :c Süre doldu, bahis iade edildi.`,
        embeds: [],
        components: [],
      });
    }
  });
};
