const emojis = require("../emoji.json");

module.exports = {
  name: "ters",
  async execute(client, message, args) {
    if (!args.length) {
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, ters çevirmem için biraz kelime lazım :3 \n> Bana boşluk veriyorsun ama ben boşluk çeviremiyorum qwq~`
      );
    }

    try {
      const reversedText = args.join(" ").split("").reverse().join("");
      await message.channel.send(
        `${emojis.bot.succes} | İşte sihirli kelimelerin ters hali~ ✨\n\`\`\`${reversedText}\`\`\``
      );
    } catch (err) {
      console.error(err);
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, kelimeleri ters çevirirken ayağım dolandı qwq~ \n> Hata: \`${err.message}\``
      );
    }
  },
  help: {
    name: "ters",
    aliases: [],
    usage: "ters [metin]",
    description: "Verilen metni ters çevirir.",
    category: "Eğlence",
    cooldown: 5,
  },
};
