const { MessageEmbed } = require("discord.js");
const emojis = require("../emoji.json");

function chooseEmoji(amount) {
  if (amount > 100000) return emojis.money.high;
  if (amount > 10000) return emojis.money.medium;
  return emojis.money.low;
}

exports.execute = async (client, message, args) => {
  try {
    const user = message.author;
    const inventoryKey = `inventory_${user.id}`;

    let inventory = await client.db.get(inventoryKey);
    if (!Array.isArray(inventory) || inventory.length === 0) {
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, envanterinizde satacak bir şey yok~ biraz sonra tekrar dene :c`
      );
    }

    const groupedItems = inventory.reduce((acc, item) => {
      if (!item || typeof item.id === "undefined") return acc;
      acc[item.id] = (acc[item.id] || 0) + 1;
      return acc;
    }, {});

    let totalEarnings = 0;
    let itemDescriptions = [];

    for (const itemId in groupedItems) {
      const count = groupedItems[itemId];
      const item = inventory.find((i) => i.id === parseInt(itemId));
      if (!item || !item.name || typeof item.value !== "number" || !item.emoji) continue;

      const itemValue = item.value * count;
      totalEarnings += itemValue;
      itemDescriptions.push(`${item.emoji} **${item.name}** x${count} → ${itemValue}`);
    }

    if (totalEarnings === 0) {
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, satılabilir bir eşya bulunamadı~ :c`
      );
    }

    await client.eco.addMoney(user.id, totalEarnings);
    await client.db.set(inventoryKey, []);

    const gainEmoji = chooseEmoji(totalEarnings);

    const embed = new MessageEmbed()
      .setTitle(`${emojis.bot.succes} Satış Tamamlandı! ${gainEmoji}`)
      .setDescription(itemDescriptions.join("\n"))
      .addField("💰 Toplam Kazanç", `${totalEarnings}`, false)
      .setColor("GREEN")
      .setTimestamp();

    return message.channel.send({ embeds: [embed] });
  } catch (error) {
    console.error('🛑 "sat" komutu işlenirken hata oluştu:', error);
    return message.reply(
      `${emojis.bot.error} | **${message.member.displayName}**, uf! Satış sırasında bir sorun çıktı~ lütfen tekrar dene :c`
    );
  }
};

exports.help = {
  name: "sat",
  aliases: ["sell"],
  usage: "sat",
  description: "Envanterinizdeki eşyaları satarak para kazanırsınız.",
  category: "Ekonomi",
  cooldown: 10,
};
