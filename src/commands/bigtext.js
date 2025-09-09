const emojis = require("../emoji.json");

exports.execute = async (client, message, args) => {
  try {
    if (!args.length) 
      return message.reply(`${emojis.bot.error} | Ooops, **${message.member.displayName}**, bir metin girmeyi unuttun~`);

    let text = args.join(" ").toLowerCase();

    // Türkçe karakterleri dönüştür
    const turkishMap = {
      ç: "c",
      ş: "s",
      ğ: "g",
      ö: "o",
      ü: "u",
      ı: "i",
    };

    text = text.split("").map(char => turkishMap[char] || char).join("");

    let alphabet = "abcdefghijklmnopqrstuvwxyz".split("");
    let numbers = "0123456789".split("");
    let bigText = "";

    for (let char of text) {
      if (alphabet.includes(char)) {
        bigText += `:regional_indicator_${char}: `;
      } else if (numbers.includes(char)) {
        const numberEmojis = {
          0: ":zero:",
          1: ":one:",
          2: ":two:",
          3: ":three:",
          4: ":four:",
          5: ":five:",
          6: ":six:",
          7: ":seven:",
          8: ":eight:",
          9: ":nine:",
        };
        bigText += `${numberEmojis[char]} `;
      } else {
        bigText += char + " ";
      }
    }

    message.channel.send(`${emojis.bot.succes} | İşte bu! **${message.member.displayName}**, metnin artık büyük ve emojili: \n${bigText}`);
    
  } catch (error) {
    console.error("Bigtext komutu hatası:", error);
    return message.reply(`${emojis.bot.error} | Haa! **${message.member.displayName}**, bir sorun çıktı~ Yeniden dener misin? :c`);
  }
};

exports.help = {
  name: "bigtext",
  aliases: ["büyükmetin"],
  usage: "bigtext <metin>",
  description: "Girilen metni büyük harfli ve sayı emojilerine çevirir. Türkçe karakterler otomatik olarak Latin harflerine dönüşür.",
  category: "Eğlence",
  cooldown: 5,
};
