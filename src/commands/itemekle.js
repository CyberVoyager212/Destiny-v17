const emojis = require("../emoji.json");

exports.execute = async (client, message, args) => {
  try {
    if (!client.config.admins.includes(message.author.id)) {
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, bu komutu kullanmaya yetkin yok... beni kandıramazsın~ >///<`
      );
    }

    const user = message.mentions.users.first();
    if (!user) {
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, kimi ödüllendireceğini söylemedin... lütfen birini etiketle~ :c\nÖrnek: \`additem @kullanıcı Elmas 💎 1000\``
      );
    }

    const itemName = args[1];
    if (!itemName) {
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, eşyanın adını yazmayı unuttun... nasıl bir şey ekleyeceğimi bilemedim >~<\nÖrnek: \`additem @kullanıcı Elmas 💎 1000\``
      );
    }

    const itemEmoji = args[2];
    if (!itemEmoji) {
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, eşyanın bir emojisini de eklemelisin yoksa çok sıkıcı olur~ :c\nÖrnek: \`additem @kullanıcı Elmas 💎 1000\``
      );
    }

    const itemValue = args[3];
    if (!itemValue || isNaN(itemValue)) {
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, eşyanın değerini yanlış girdin... biraz daha dikkatli ol lütfen >///<\nÖrnek: \`additem @kullanıcı Elmas 💎 1000\``
      );
    }

    const newItem = {
      name: itemName,
      emoji: itemEmoji,
      value: parseInt(itemValue),
    };

    const inventoryKey = `inventory_${user.id}`;
    const inventory = (await client.db.get(inventoryKey)) || [];
    inventory.push(newItem);
    await client.db.set(inventoryKey, inventory);

    return message.channel.send(
      `${emojis.bot.succes} | **${user.username}** kullanıcısına yeni eşya eklendi!\n🆕 **Eşya:** ${newItem.emoji} ${newItem.name}\n💰 **Değer:** ${newItem.value}`
    );
  } catch (error) {
    console.error("⚠️ additem komutu hata:", error);
    return message.reply(
      `${emojis.bot.error} | ⏱ **${message.member.displayName}**, eşyayı eklerken bir şeyler ters gitti... sanki elimden kayıp gitti~ :c`
    );
  }
};

exports.help = {
  name: "additem",
  aliases: [],
  usage: "additem @user <item_name> <item_emoji> <item_value>",
  description: "Kullanıcının envanterine yeni bir eşya ekler.",
  category: "Ekonomi",
  cooldown: 5,
  admin: true,
};
