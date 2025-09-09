const emojis = require("../emoji.json");

exports.help = {
  name: "rozet",
  aliases: ["rozetyap", "badge"],
  usage: "rozet <yazı>",
  description: "Yazınızı unicode karakterlerle rozet olarak gönderir.",
  category: "Eğlence",
  cooldown: 5,
};

const fancyLetters = {
  A: "𝕬", B: "𝕭", C: "𝕮", D: "𝕯", E: "𝕰", F: "𝕱", G: "𝕲",
  H: "𝕳", I: "𝕴", J: "𝕵", K: "𝕶", L: "𝕷", M: "𝕸", N: "𝕹",
  O: "𝕺", P: "𝕻", Q: "𝕼", R: "𝕽", S: "𝕾", T: "𝕿", U: "𝖀",
  V: "𝖁", W: "𝖂", X: "𝖃", Y: "𝖄", Z: "𝖅",
  a: "𝖆", b: "𝖇", c: "𝖈", d: "𝖉", e: "𝖊", f: "𝖋", g: "𝖌",
  h: "𝖍", i: "𝖎", j: "𝖏", k: "𝖐", l: "𝖑", m: "𝖒", n: "𝖓",
  o: "𝖔", p: "𝖕", q: "𝖖", r: "𝖗", s: "𝖘", t: "𝖙", u: "𝖚",
  v: "𝖛", w: "𝖜", x: "𝖝", y: "𝖞", z: "𝖟",
  0: "𝟘", 1: "𝟙", 2: "𝟚", 3: "𝟛", 4: "𝟜", 5: "𝟝",
  6: "𝟞", 7: "𝟟", 8: "𝟠", 9: "𝟡", " ": " ",
};

function toFancy(text) {
  return text
    .split("")
    .map((c) => fancyLetters[c] || c)
    .join("");
}

exports.execute = async (client, message, args) => {
  try {
    if (!args[0]) {
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, rozeti yapmak için bir yazı girmelisin~ :c`
      );
    }

    const input = args.join(" ");
    const fancy = toFancy(input);

    const rozet = `✦ ✧ ✦ ✧ ✦
🌟 ${fancy} 
✦ ✧ ✦ ✧ ✦`;

    message.channel.send(`${emojis.bot.succes} | İşte rozetin hazır! ✨\n${rozet}`);
  } catch (err) {
    console.error("rozet komutu hatası:", err);
    message.reply(
      `${emojis.bot.error} | **${message.member.displayName}**, uf! Rozet oluşturulurken bir sorun çıktı... lütfen sonra tekrar dene~ :c`
    );
  }
};
