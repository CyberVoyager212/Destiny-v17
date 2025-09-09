const { Client, Message, MessageEmbed } = require("discord.js");
const fetch = require("node-fetch");

module.exports.help = {
  name: "gunfight",
  aliases: ["duel", "shoot"],
  description: "Belirtilen kullanıcıyla düello yap.",
  usage: "gunfight [@kullanıcı]",
  category: "Eğlence",
  cooldown: 5,
};

module.exports.execute = async (bot, message, args) => {
  if (!args[0])
    return message.channel.send("**Lütfen bir kullanıcı etiketleyin!**");

  let opponent =
    message.mentions.members.first() ||
    message.guild.members.cache.get(args[0]) ||
    message.guild.members.cache.find(
      (r) => r.user.username.toLowerCase() === args.join(" ").toLowerCase()
    ) ||
    message.guild.members.cache.find(
      (r) => r.displayName.toLowerCase() === args.join(" ").toLowerCase()
    );

  if (!opponent)
    return message.channel.send("**Lütfen geçerli bir kullanıcı girin!**");
  if (opponent.user.bot)
    return message.channel.send("**Botlarla düello yapamazsınız!**");
  if (opponent.user.id === message.author.id)
    return message.channel.send("**Kendi kendinize düello yapamazsınız!**");

  if (!bot.games) bot.games = new Map(); // Eğer bot.games tanımlı değilse oluştur

  const current = bot.games.get(message.channel.id);
  if (current)
    return message.channel.send(
      `**Lütfen mevcut \`${current.name}\` oyununun bitmesini bekleyin!**`
    );

  bot.games.set(message.channel.id, { name: "gunfight" });

  try {
    await message.channel.send(
      `**${opponent}, bu meydan okumayı kabul ediyor musun?**`
    );
    const verification = await verify(message.channel, opponent);

    if (!verification) {
      bot.games.delete(message.channel.id);
      return message.channel.send(
        `**Görünüşe göre ${opponent} oynamak istemiyor!**`
      );
    }

    await message.channel.send("**Hazır olun, oyun her an başlayabilir!**");
    await delay(randomRange(1000, 10000));

    const words = ["fire", "shoot", "bang", "pow", "boom"];
    const word = words[Math.floor(Math.random() * words.length)];

    await message.channel.send(
      `**HIZLI OLUN! \`${word.toUpperCase()}\` YAZIN!**`
    );

    const filter = (res) =>
      [opponent.user.id, message.author.id].includes(res.author.id) &&
      res.content.toLowerCase() === word.toLowerCase();
    const winner = await message.channel.awaitMessages({
      filter,
      max: 1,
      time: 30000,
    });

    bot.games.delete(message.channel.id);
    if (!winner.size) return message.channel.send("**Kimse kazanamadı!**");
    return message.channel.send(`**Kazanan: ${winner.first().author}!**`);
  } catch (err) {
    bot.games.delete(message.channel.id);
    console.error(err);
  }
};

async function verify(channel, user) {
  const filter = (res) =>
    res.author.id === user.id &&
    ["evet", "hayır"].includes(res.content.toLowerCase());
  const response = await channel.awaitMessages({ filter, max: 1, time: 30000 });
  return response.size && response.first().content.toLowerCase() === "evet";
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
