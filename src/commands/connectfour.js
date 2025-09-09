const { Client, Message } = require("discord.js");
const emojis = require("../emoji.json");

const blankEmoji = "⚪";
const playerOneEmoji = "🔴";
const playerTwoEmoji = "🟡";
const nums = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣"];

module.exports.help = {
  name: "connectfour",
  aliases: ["connect4", "c4"],
  description:
    "Bir kullanıcıyla veya bot ile Dört Bağlantı (Connect Four) oyunu oyna.",
  usage: "connectfour [@kullanıcı] [basit/kolay/normal/zor/imkansız]",
  category: "Eğlence",
  cooldown: 5,
};

module.exports.execute = async (bot, message, args) => {
  let opponent = message.mentions.members.first();
  let againstBot = false;
  let difficulty;

  if (!opponent) {
    againstBot = true;

    if (
      !args[0] ||
      !["basit", "kolay", "normal", "zor", "imkansız"].includes(
        args[0].toLowerCase()
      )
    ) {
      return message.channel.send(
        `${emojis.bot.error} | Ahh~ zorluk seçmeyi unutmuş gibisin, ${message.member.displayName}! Lütfen **basit, kolay, normal, zor** veya **imkansız** yaz ve tekrar dene~`
      );
    }

    difficulty = args[0].toLowerCase();
    opponent = bot.user;
  }

  if (!opponent) {
    return message.channel.send(
      `${emojis.bot.error} | Hımm… kiminle oynamak istediğini göremiyorum, etiketleyebilir misin? 🥺`
    );
  }

  if (opponent.user && opponent.user.bot && !againstBot) {
    return message.channel.send(
      `${emojis.bot.error} | Üzgünüm~ bu kullanıcı bir bot, gerçek bir rakip etiketle lütfen~`
    );
  }

  if (opponent.user && opponent.user.id === message.author.id) {
    return message.channel.send(
      `${emojis.bot.error} | Kendinle oynamaya çalışıyorsun ama ben buna izin veremem~ Önce bir arkadaş etiketle olur mu? 😊`
    );
  }

  const currentGame = bot.games.get(message.channel.id);
  if (currentGame) {
    return message.channel.send(
      `${emojis.bot.error} | Burada zaten bir oyun var, birinin bitmesini bekle lütfen~ sabırlı ol, tamam mı?`
    );
  }

  bot.games.set(message.channel.id, { name: "connectfour" });

  let board = generateBoard();
  let userTurn = true;
  let winner = null;
  const colLevels = [5, 5, 5, 5, 5, 5, 5];

  while (!winner && board.some((row) => row.includes(null))) {
    const user = userTurn ? message.author : opponent;
    const sign = userTurn ? "user" : "oppo";

    await message.channel.send(
      `${user}, sıra sende~ Hangi sütuna koymak istersin? Lütfen 1-7 arasında bir sayı yaz 💫\n${displayBoard(
        board
      )}\n${nums.join(" ")}`
    );

    let choice;

    if (againstBot && !userTurn) {
      if (difficulty === "basit") {
        choice = getSimpleMove(colLevels);
      } else if (difficulty === "kolay") {
        choice = getRandomMove(colLevels);
      } else if (difficulty === "normal") {
        choice = getSmartMove(board, colLevels);
      } else if (difficulty === "zor") {
        choice = getBestMove(board, colLevels);
      } else {
        choice = getImpossibleMove(board, colLevels);
      }
    } else {
      const filter = (res) =>
        res.author.id === user.id && /^[1-7]$/.test(res.content);
      const turn = await message.channel.awaitMessages({
        filter,
        max: 1,
        time: 60000,
      });

      if (!turn.size) {
        winner = userTurn ? opponent : message.author;
        await message.channel.send(
          `${emojis.bot.error} | Zaman doldu~ Görünüşe göre ${winner} otomatik olarak kazanmış oldu. Bir dahaki sefere daha hızlı olalım lütfen~`
        );
        break;
      }

      choice = parseInt(turn.first().content, 10) - 1;
      if (colLevels[choice] < 0) {
        await message.channel.send(
          `${emojis.bot.error} | O sütun dolu gözüküyor~ Başka bir sütun seç, lütfen!`
        );
        userTurn = userTurn; // aynı oyuncu devam etsin
        continue;
      }
    }

    board[colLevels[choice]][choice] = sign;
    colLevels[choice] -= 1;

    if (checkWin(board)) {
      winner = user;
      break;
    }
    userTurn = !userTurn;
  }

  const opponentId = opponent.id || (opponent.user && opponent.user.id);
  const opponentGames = (bot.db.get(`games_${opponentId}`) || 0) + 1;
  const authorGames = (bot.db.get(`games_${message.author.id}`) || 0) + 1;
  bot.db.set(`games_${opponentId}`, opponentGames);
  bot.db.set(`games_${message.author.id}`, authorGames);

  bot.games.delete(message.channel.id);

  if (winner) {
    await message.channel.send(
      `${emojis.bot.succes} | Tebrikler ${winner}! Harika hamleydi~ 🥳`
    );
  } else {
    await message.channel.send(
      `${emojis.bot.error} | Oyun bitti ve berabere kaldınız~ Bir dahaki sefer daha heyecanlı oluruz değil mi?`
    );
  }
};

function getSimpleMove(colLevels) {
  return colLevels.findIndex((level) => level >= 0);
}

function getRandomMove(colLevels) {
  let availableCols = colLevels
    .map((level, index) => (level >= 0 ? index : -1))
    .filter((index) => index !== -1);
  return availableCols[Math.floor(Math.random() * availableCols.length)];
}

function getSmartMove(board, colLevels) {
  return getRandomMove(colLevels);
}

function getBestMove(board, colLevels) {
  for (let i = 0; i < 7; i++) {
    if (colLevels[i] >= 0) {
      let tempBoard = JSON.parse(JSON.stringify(board));
      tempBoard[colLevels[i]][i] = "oppo";
      if (checkWin(tempBoard)) return i;
    }
  }
  return getRandomMove(colLevels);
}

function getImpossibleMove(board, colLevels) {
  for (let i = 0; i < 7; i++) {
    if (colLevels[i] >= 0) {
      let tempBoard = JSON.parse(JSON.stringify(board));
      tempBoard[colLevels[i]][i] = "oppo";
      if (checkWin(tempBoard)) return i;
    }
  }

  for (let i = 0; i < 7; i++) {
    if (colLevels[i] >= 0) {
      let tempBoard = JSON.parse(JSON.stringify(board));
      tempBoard[colLevels[i]][i] = "user";
      if (checkWin(tempBoard)) return i;
    }
  }

  return getRandomMove(colLevels);
}

function generateBoard() {
  return Array(6)
    .fill(null)
    .map(() => Array(7).fill(null));
}

function displayBoard(board) {
  return board
    .map((row) =>
      row
        .map((piece) =>
          piece === "user"
            ? playerOneEmoji
            : piece === "oppo"
            ? playerTwoEmoji
            : blankEmoji
        )
        .join("")
    )
    .join("\n");
}

function checkWin(board) {
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 7; c++) {
      if (
        c + 3 < 7 &&
        checkLine(
          board[r][c],
          board[r][c + 1],
          board[r][c + 2],
          board[r][c + 3]
        )
      )
        return true;
      if (
        r + 3 < 6 &&
        checkLine(
          board[r][c],
          board[r + 1][c],
          board[r + 2][c],
          board[r + 3][c]
        )
      )
        return true;
      if (
        r + 3 < 6 &&
        c + 3 < 7 &&
        checkLine(
          board[r][c],
          board[r + 1][c + 1],
          board[r + 2][c + 2],
          board[r + 3][c + 3]
        )
      )
        return true;
      if (
        r - 3 >= 0 &&
        c + 3 < 7 &&
        checkLine(
          board[r][c],
          board[r - 1][c + 1],
          board[r - 2][c + 2],
          board[r - 3][c + 3]
        )
      )
        return true;
    }
  }
  return false;
}

function checkLine(a, b, c, d) {
  return a !== null && a === b && a === c && a === d;
}
