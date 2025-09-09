const { MessageEmbed } = require("discord.js");
const emojis = require("../emoji.json"); // emoji.json yolunu kendi yapına göre ayarla

module.exports.help = {
  name: "basit-oyun",
  aliases: ["b-oyun", "bo", "basito"],
  description: "Üç taş (Tic-Tac-Toe) veya taş-kağıt-makas (RPS) oyunu oynayın!",
  usage: "basit-oyun [tkm / üt] [@kullanıcı (üt için)]",
  category: "Eğlence",
  cooldown: 5,
};

module.exports.execute = async (bot, message, args) => {
  if (!args[0]) {
    return message.channel.send(
      `❌ | **${message.member.displayName}**, lütfen bir oyun seç: \`tkm\` veya \`üt\`!`
    );
  }

  const gameType = args[0].toLowerCase();

  if (!bot.games) bot.games = new Map();

  if (gameType === "tkm") {
    return playRPS(bot, message, args);
  } else if (gameType === "üt") {
    return playTicTacToe(bot, message, args);
  } else {
    return message.channel.send(
      `❌ | **${message.member.displayName}**, geçersiz oyun türü! Sadece \`tkm\` veya \`üt\` seçebilirsin :c`
    );
  }
};

// -------------------- Taş Kağıt Makas --------------------
async function playRPS(bot, message, args) {
  const choices = ["taş", "kağıt", "makas"];
  const res = { taş: "🪨 Taş", kağıt: "📜 Kağıt", makas: "✂️ Makas" };

  const userChoice = args[1]?.toLowerCase();
  if (!choices.includes(userChoice))
    return message.channel.send(
      `⏱ | **${message.member.displayName}**, lütfen \`taş\`, \`kağıt\` veya \`makas\` yaz :c`
    );

  const botChoice = choices[Math.floor(Math.random() * choices.length)];

  let resultText;
  if (userChoice === botChoice) {
    resultText = `⚖️ Berabere! Hiç kimse kazanamadı :c`;
  } else if (
    (userChoice === "taş" && botChoice === "kağıt") ||
    (userChoice === "kağıt" && botChoice === "makas") ||
    (userChoice === "makas" && botChoice === "taş")
  ) {
    resultText = `${emojis.bot.error} | Maalesef, **${bot.user.username} kazandı**!`;
  } else {
    resultText = `${emojis.bot.succes} | Tebrikler **${message.member.displayName}**, kazandın! 🎉`;
  }

  const embed = new MessageEmbed()
    .setTitle(`${message.member.displayName} vs ${bot.user.username} - Taş Kağıt Makas`)
    .addFields(
      { name: `${message.member.displayName}`, value: res[userChoice], inline: true },
      { name: `${bot.user.username}`, value: res[botChoice], inline: true },
      { name: "Sonuç", value: resultText }
    )
    .setColor(resultText.includes(emojis.bot.succes) ? "GREEN" : "RED")
    .setTimestamp();

  return message.channel.send({ embeds: [embed] });
}

// -------------------- Üç Taş --------------------
async function playTicTacToe(bot, message, args) {
  if (!args[1])
    return message.channel.send(
      `⏱ | **${message.member.displayName}**, bir kullanıcı etiketlemelisin~ :c`
    );

  const opponent =
    message.mentions.members.first() ||
    message.guild.members.cache.get(args[1]) ||
    message.guild.members.cache.find(
      (r) => r.user.username.toLowerCase() === args.slice(1).join(" ").toLowerCase()
    ) ||
    message.guild.members.cache.find(
      (r) => r.displayName.toLowerCase() === args.slice(1).join(" ").toLowerCase()
    );

  if (!opponent)
    return message.channel.send(`${emojis.bot.error} | Geçerli bir kullanıcı bulunamadı! :c`);
  if (opponent.user.bot)
    return message.channel.send(`${emojis.bot.error} | Botlarla oynayamazsınız :c`);
  if (opponent.id === message.author.id)
    return message.channel.send(`${emojis.bot.error} | Kendi kendine oynayamazsın :c`);

  if (bot.games.get(message.channel.id))
    return message.channel.send(`${emojis.bot.error} | Bu kanalda zaten bir oyun var, bekle biraz~ ⏳`);

  bot.games.set(message.channel.id, { name: "tictactoe" });

  try {
    await message.channel.send(
      `${opponent}, **${message.member.displayName}** sana meydan okuyor! Kabul ediyor musun? (evet/hayır)`
    );
    const verification = await verify(message.channel, opponent);
    if (!verification) {
      bot.games.delete(message.channel.id);
      return message.channel.send(`${emojis.bot.error} | Görünüşe göre ${opponent} oynamak istemiyor :c`);
    }

    const sides = ["1","2","3","4","5","6","7","8","9"];
    const taken = [];
    let userTurn = true;
    let winner = null;
    let lastTurnTimeout = false;

    while (!winner && taken.length < 9) {
      const user = userTurn ? message.author : opponent;
      const sign = userTurn ? "❌" : "⭕";

      await message.channel.send(
        `**${user}**, hangi kareyi seçiyorsun? \`Bırak\` yazarak pes edebilirsin!\n\`\`\`
${sides[0]} | ${sides[1]} | ${sides[2]}
---------
${sides[3]} | ${sides[4]} | ${sides[5]}
---------
${sides[6]} | ${sides[7]} | ${sides[8]}
\`\`\``
      );

      const filter = (res) => res.author.id === user.id && (sides.includes(res.content) || res.content.toLowerCase() === "bırak");
      const turn = await message.channel.awaitMessages({ filter, max: 1, time: 30000 });

      if (!turn.size) {
        await message.channel.send(`⏱ | **${user.username}**, biraz yavaş kaldın~ zaman doldu :c`);
        if (lastTurnTimeout) {
          winner = "süre";
          break;
        } else {
          userTurn = !userTurn;
          lastTurnTimeout = true;
          continue;
        }
      }

      const choice = turn.first().content;
      if (choice.toLowerCase() === "bırak") {
        winner = userTurn ? opponent : message.author;
        break;
      }

      sides[parseInt(choice, 10) - 1] = sign;
      taken.push(choice);

      if (verifyWin(sides)) winner = userTurn ? message.author : opponent;
      if (lastTurnTimeout) lastTurnTimeout = false;
      userTurn = !userTurn;
    }

    bot.games.delete(message.channel.id);

    if (winner === "süre") return message.channel.send(`${emojis.bot.error} | Oyun süresizliğe takıldı, iptal edildi! :c`);
    if (winner) return message.channel.send(`${emojis.bot.succes} | Tebrikler, ${winner}! 🎉`);
    return message.channel.send(`⚖️ | Berabere!`);
  } catch (err) {
    bot.games.delete(message.channel.id);
    console.error(err);
    return message.channel.send(`${emojis.bot.error} | Hata oluştu! Lütfen tekrar dene :c`);
  }
}

// -------------------- Yardımcı Fonksiyonlar --------------------
function verifyWin(sides) {
  return (
    (sides[0] === sides[1] && sides[0] === sides[2]) ||
    (sides[3] === sides[4] && sides[3] === sides[5]) ||
    (sides[6] === sides[7] && sides[6] === sides[8]) ||
    (sides[0] === sides[3] && sides[0] === sides[6]) ||
    (sides[1] === sides[4] && sides[1] === sides[7]) ||
    (sides[2] === sides[5] && sides[2] === sides[8]) ||
    (sides[0] === sides[4] && sides[0] === sides[8]) ||
    (sides[2] === sides[4] && sides[2] === sides[6])
  );
}

async function verify(channel, user) {
  const filter = (res) => res.author.id === user.id && ["evet", "hayır"].includes(res.content.toLowerCase());
  const response = await channel.awaitMessages({ filter, max: 1, time: 30000 });
  return response.size && response.first().content.toLowerCase() === "evet";
}
