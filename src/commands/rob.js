const emojis = require("../emoji.json");

function chooseMoneyEmoji(value) {
  if (value > 100000) return emojis.money.high;
  if (value > 10000) return emojis.money.medium;
  return emojis.money.low;
}

exports.execute = async (client, message, args) => {
  try {
    const robber = message.author;
    const targetUser = message.mentions.users.first();

    if (!targetUser || targetUser.bot || targetUser.id === robber.id) {
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, geçerli bir kullanıcıyı etiketle~ kendini veya botu soyamazsın :c`
      );
    }

    const targetInvKey = `inventory_${targetUser.id}`;
    const robberMoneyKey = `money_${robber.id}`;

    let targetInventory = await client.db.get(targetInvKey);
    if (!Array.isArray(targetInventory) || targetInventory.length === 0) {
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, hedef kişinin envanteri boş~ çalacak bir şey yok :c`
      );
    }

    const chosenIndex = Math.floor(Math.random() * targetInventory.length);
    const item = targetInventory[chosenIndex];

    if (!item || typeof item.value !== "number" || !item.name || !item.emoji) {
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, geçerli bir eşya bulunamadı, hedefin envanteri eksik veya bozuk :c`
      );
    }

    // Hedeften item'i çıkar
    targetInventory.splice(chosenIndex, 1);
    await client.db.set(targetInvKey, targetInventory);

    // Parayı soyguncuya ver
    await client.db.add(robberMoneyKey, item.value);

    const moneyEmoji = chooseMoneyEmoji(item.value);

    return message.channel.send(
      `${emojis.bot.succes} | **${message.member.displayName}**, başarıyla ${targetUser} kişisinden ${item.emoji} **${item.name}** çaldın ve satıp **${item.value} ${moneyEmoji}** kazandın! ✨`
    );
  } catch (err) {
    console.error("Soygun komutu hatası:", err);
    return message.reply(
      `${emojis.bot.error} | **${message.member.displayName}**, uf! Soygun sırasında bir sorun çıktı... Lütfen biraz sabırlı ol ve tekrar dene~ :c`
    );
  }
};

exports.help = {
  name: "rob",
  aliases: ["soy"],
  usage: "rob @kullanıcı",
  description:
    "Bir kullanıcının envanterinden eşya çalıp satıp para kazanırsın~",
  category: "Ekonomi",
  cooldown: 20,
};
