const figlet = require("figlet");
const emojis = require("../emoji.json");

module.exports.help = {
  name: "ascii",
  aliases: ["textart", "ascii-art"],
  description: "Verilen metni ASCII sanatı olarak dönüştürür.",
  usage: "ascii <metin>",
  category: "Eğlence",
  cooldown: 5,
};

module.exports.execute = async (client, message, args) => {
  try {
    if (!args[0]) {
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, lütfen dönüştürmek istediğin metni yaz~ Çok hızlı davranıyorsun gibi görünüyor :c`
      );
    }

    const text = args.join(" ");

    figlet.text(
      text,
      { horizontalLayout: "default", verticalLayout: "default" },
      (err, data) => {
        if (err) {
          console.error("FIGLET HATASI:", err);
          return message.channel.send(
            `${emojis.bot.error} | **${message.member.displayName}**, ASCII sanatı oluşturulurken bir hata oluştu~ Lütfen tekrar dene!`
          );
        }

        if (data.length <= 2000) {
          return message.channel.send(
            `${emojis.bot.succes} | **ASCII Sanatın Hazır!**\n\`\`\`\n${data}\n\`\`\``
          );
        } else {
          const chunks = data.match(/[\s\S]{1,1900}/g);
          chunks.forEach((chunk) => {
            message.channel.send(
              `${emojis.bot.succes} | **ASCII Sanat Parçası**\n\`\`\`\n${chunk}\n\`\`\``
            );
          });
        }
      }
    );
  } catch (error) {
    console.error("ASCII komutu hata:", error);
    return message.channel.send(
      `${emojis.bot.error} | **${message.member.displayName}**, beklenmedik bir hata oluştu~ 😢 Lütfen tekrar dene!`
    );
  }
};
