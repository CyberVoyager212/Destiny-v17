const { MessageEmbed } = require("discord.js");
const emojis = require("../emoji.json");

exports.help = {
  name: "fal",
  aliases: [],
  usage: "fal <soru>",
  description: "Geleceğini tahmin eder, eğlencelik bir fal bakar.",
  category: "Eğlence",
  cooldown: 5,
};

exports.execute = async (client, message, args) => {
  const responses = [
    "Belki.",
    "Kesinlikle hayır.",
    "Umarım öyledir.",
    "Bunu hayal bile edemezsin.",
    "Bunun iyi bir ihtimali var.",
    "Oldukça olası.",
    "Sanırım öyle.",
    "Umarım değildir.",
    "Umarım öyledir.",
    "Asla!",
    "Unut gitsin.",
    "Ahaha! Gerçekten mi?!?",
    "Pfft.",
    "Üzgünüm dostum.",
    "Kesinlikle evet.",
    "Kesinlikle hayır.",
    "Gelecek karanlık.",
    "Gelecek belirsiz.",
    "Bunu söylemeyi tercih etmem.",
    "Kimin umurunda?",
    "Muhtemelen.",
    "Asla, asla, asla.",
    "Küçük bir ihtimal var.",
    "Evet!",
  ];

  if (!args.length) {
    return message.channel.send(
      `${emojis.bot.error} | **${message.member.displayName}**, hmm... bana sormadan fal mı açmamı istiyorsun? Bir soru yazmalısın~ >w<`
    );
  }

  try {
    const question = args.join(" ");
    const answer = responses[Math.floor(Math.random() * responses.length)];

    const embed = new MessageEmbed()
      .setTitle(`${emojis.bot.succes} Fal Sonucu`)
      .addField("✨ Sorduğun:", question)
      .addField("💫 Cevap:", answer)
      .setColor("#FFC0CB")
      .setFooter({
        text: `${message.member.displayName} için yıldızlar söylüyor...`,
        iconURL: message.author.displayAvatarURL(),
      })
      .setTimestamp();

    return message.channel.send({ embeds: [embed] });
  } catch (err) {
    return message.channel.send(
      `${emojis.bot.error} | **${message.member.displayName}**, yıldızlara bakarken bir şeyler ters gitti~ qwq\n\`\`\`js\n${String(err).slice(0, 1500)}\n\`\`\``
    );
  }
};
