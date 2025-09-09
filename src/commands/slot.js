const { MessageEmbed } = require("discord.js");
const emojis = require("../emoji.json"); // emoji.json içe aktarılır

function chooseEmoji(amount) {
  if (amount > 100000) return emojis.money.high;
  if (amount > 10000) return emojis.money.medium;
  return emojis.money.low;
}

exports.execute = async (client, message, args) => {
  try {
    let betAmount = parseInt(args[0], 10);
    let userBalance = await client.eco.fetchMoney(message.author.id);
    const maxBet = 250000;

    if (args[0] === "all") {
      betAmount = Math.min(userBalance.amount, maxBet);
    }

    if (isNaN(betAmount) || betAmount <= 0) {
      return message.reply(`${emojis.bot.error} | **${message.member.displayName}**, lütfen geçerli bir bahis miktarı gir~ :c`);
    }

    if (betAmount > maxBet) betAmount = maxBet;

    if (userBalance.amount < betAmount) {
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, yeterli bakiyen yok~ Mevcut paran: \`${userBalance.amount}\` ${chooseEmoji(userBalance.amount)}`
      );
    }

    await client.eco.removeMoney(message.author.id, betAmount);

    const spinningEmoji = emojis.slot.spinning;
    const slotEmojis = [emojis.slot.slot1, emojis.slot.slot2, emojis.slot.slot3];
    const multipliers = {
      [emojis.slot.slot1]: 2,
      [emojis.slot.slot2]: 3,
      [emojis.slot.slot3]: 4,
    };

    let slotMessage = await message.channel.send(`
🎰 **Slot Makinesi Çalışıyor...** ⏱

[ ${spinningEmoji} | ${spinningEmoji} | ${spinningEmoji} ]
Oynanan Miktar: ${betAmount} ${chooseEmoji(betAmount)}
Kullanıcı: ${message.member.displayName}
    `);

    await new Promise(resolve => setTimeout(resolve, 2500));

    let isWinner = Math.random() < 0.5;
    let finalSlots = isWinner
      ? Array(3).fill(slotEmojis[Math.floor(Math.random() * slotEmojis.length)])
      : Array.from({ length: 3 }, () => slotEmojis[Math.floor(Math.random() * slotEmojis.length)]);

    let revealedSlots = [spinningEmoji, spinningEmoji, spinningEmoji];
    for (let i = 0; i < 3; i++) {
      revealedSlots[i] = finalSlots[i];
      await slotMessage.edit(`
🎰 **Slot Makinesi Çalışıyor...** ⏱

[ ${revealedSlots[0]} | ${revealedSlots[1]} | ${revealedSlots[2]} ]
Oynanan Miktar: ${betAmount} ${chooseEmoji(betAmount)}
Kullanıcı: ${message.member.displayName}
      `);
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    let reward = 0;
    if (isWinner) {
      reward = betAmount * multipliers[finalSlots[0]];
      await client.eco.addMoney(message.author.id, reward);
    }

    await slotMessage.edit(`
🎰 **Slot Sonucu** 🎉

[ ${finalSlots[0]} | ${finalSlots[1]} | ${finalSlots[2]} ]
Oynanan Miktar: ${betAmount} ${chooseEmoji(betAmount)}
Kullanıcı: ${message.member.displayName}
${
  reward > 0
    ? `${emojis.bot.succes} | Kazanç: +${reward} ${chooseEmoji(reward)} ✨`
    : `${emojis.bot.error} | Kaybettiniz: -${betAmount} ${chooseEmoji(betAmount)} 😢`
}
    `);
  } catch (error) {
    console.error(error);
    return message.reply(`${emojis.bot.error} | **${message.member.displayName}**, bir hata oluştu~ lütfen tekrar deneyin :c`);
  }
};

exports.help = {
  name: "slot",
  aliases: [],
  usage: "slot <miktar> veya slot all",
  description: "Slot makinesi oynayarak şansını dene~ 🍀",
  category: "Ekonomi",
  cooldown: 5,
};
