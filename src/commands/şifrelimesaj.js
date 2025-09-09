// şifrelimesaj.js
const crypto = require("crypto");

const MAX_ENCRYPTION_LIMIT = 10;
const SECRET = "sifrelemeAnahtari";

function encryptText(text) {
  const cipher = crypto.createCipher("aes-256-cbc", SECRET);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return encrypted;
}

function decryptText(encryptedText) {
  const decipher = crypto.createDecipher("aes-256-cbc", SECRET);
  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

function isHex(str) {
  return /^[0-9A-Fa-f]+$/.test(str) && str.length % 2 === 0;
}

exports.execute = async (client, message, args) => {
  if (args[0] === "şifrele") {
    let repeat = parseInt(args[1]);
    let textIndex = isNaN(repeat) ? 1 : 2;
    let text = args.slice(textIndex).join(" ");
    if (!text) return message.reply("Lütfen şifrelemek için bir metin girin.");

    if (isNaN(repeat) || repeat < 1) repeat = 1;
    if (repeat > MAX_ENCRYPTION_LIMIT) repeat = MAX_ENCRYPTION_LIMIT;

    let result = text;
    for (let i = 0; i < repeat; i++) result = encryptText(result);

    message.channel.send(`Şifrelenmiş Mesaj (${repeat} kez): \`${result}\``);
  } else if (args[0] === "çöz") {
    let encryptedText = args.slice(1).join(" ");
    if (!encryptedText)
      return message.reply("Lütfen şifrelenmiş bir metin girin.");

    try {
      let result = encryptedText;
      while (isHex(result)) {
        result = decryptText(result);
      }
      message.channel.send(`Çözülen Mesaj: \`${result}\``);
    } catch {
      message.reply("Şifre çözme sırasında bir hata oluştu.");
    }
  } else {
    message.reply("Geçersiz kullanım. `şifrelimesaj şifrele|çöz <...>`");
  }
};

exports.help = {
  name: "şifrelimesaj",
  aliases: ["şm", "şifrelim", "şmesaj", "şifre"],
  usage: "şifrelimesaj [şifrele|çöz] [kaç kere] <metin>",
  description: "Mesajı AES-256 ile şifreler veya çözer.",
  category: "Araçlar",
  cooldown: 10,
};
