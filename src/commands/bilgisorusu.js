const { MessageEmbed, MessageActionRow, MessageButton } = require("discord.js");
const emojis = require("../emoji.json");

let questions = [
  {
    question:
      "Kuantum fiziğinde, gözlemcinin sistemi nasıl etkilediğini açıklayan kavram nedir?",
    options: {
      A: "Süperpozisyon",
      B: "Örüntüleme",
      C: "Kuantum Dolanıklığı",
      D: "Gözlemci Etkisi",
    },
    correct: "D",
  },
  {
    question: "'Gödel'in Eksiksizsizlik Teoremi' neyi ifade eder?",
    options: {
      A: "Tüm matematiksel ifadelerin doğrulanabilir olduğunu",
      B: "Her tutarlı biçimsel sistemin karar verilemez ifadeler içerdiğini",
      C: "Tüm doğa yasalarının birleşik bir teoride açıklanabileceğini",
      D: "Zaman yolculuğunun mümkün olduğunu",
    },
    correct: "B",
  },
  {
    question:
      "Evrenin genişlemesinin hızlanmasından sorumlu olduğu düşünülen gizemli enerji türü nedir?",
    options: {
      A: "Kara madde",
      B: "Kara enerji",
      C: "Nükleer enerji",
      D: "Kinetik enerji",
    },
    correct: "B",
  },
];

exports.execute = async (client, message, args) => {
  try {
    if (questions.length === 0) {
      return message.reply(`${emojis.bot.error} | Ahh, **${message.member?.displayName || message.author.username}**, quiz soruları tükenmiş gibi görünüyor~`);
    }

    const randomIndex = Math.floor(Math.random() * questions.length);
    const questionData = questions[randomIndex];

    const embed = new MessageEmbed()
      .setTitle("📚 Bilgi Sorusu")
      .setDescription(questionData.question)
      .addFields(
        { name: "A)", value: questionData.options.A, inline: true },
        { name: "B)", value: questionData.options.B, inline: true },
        { name: "C)", value: questionData.options.C, inline: true },
        { name: "D)", value: questionData.options.D, inline: true }
      )
      .setColor("BLUE")
      .setFooter({ text: "Cevaplamak için butonlara tıklayın. Süre: 40 dakika" })
      .setTimestamp();

    const row = new MessageActionRow().addComponents(
      new MessageButton().setCustomId("A").setLabel("A").setStyle("PRIMARY"),
      new MessageButton().setCustomId("B").setLabel("B").setStyle("PRIMARY"),
      new MessageButton().setCustomId("C").setLabel("C").setStyle("PRIMARY"),
      new MessageButton().setCustomId("D").setLabel("D").setStyle("PRIMARY")
    );

    const sentMessage = await message.channel.send({
      content: `${emojis.bot.succes} | Hazır, soru gönderildi! Cevaplamak için butonlara tıkla, **${message.member?.displayName || message.author.username}**~`,
      embeds: [embed],
      components: [row],
    });

    const filter = (interaction) =>
      interaction.isButton && ["A", "B", "C", "D"].includes(interaction.customId) && !interaction.user.bot;

    const collector = sentMessage.createMessageComponentCollector({
      filter,
      time: 2400000, // 40 dakika
    });

    let userAnswers = new Map();

    collector.on("collect", async (interaction) => {
      try {
        if (userAnswers.has(interaction.user.id)) {
          return interaction.reply({
            content: `${emojis.bot.error} | Hey ${interaction.user.username}, zaten bir cevap vermişsin, sabırlı ol lütfen~`,
            ephemeral: true,
          });
        }

        userAnswers.set(interaction.user.id, interaction.customId);

        await interaction.reply({
          content: `${emojis.bot.succes} | Cevabın alındı: **${interaction.customId}**, teşekkürler ${interaction.user.username}!`,
          ephemeral: true,
        });
      } catch (err) {
        console.error("Collector collect hatası:", err);
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: `${emojis.bot.error} | Hımmm, cevabın kaydedilemedi gibi... Bir daha dener misin lütfen?`,
            ephemeral: true,
          });
        }
      }
    });

    collector.on("end", async () => {
      try {
        let correctUsers = [];
        let incorrectUsers = [];

        userAnswers.forEach((answer, userId) => {
          const member = message.guild?.members.cache.get(userId);
          const display = member ? `${member.user.tag}` : "Bilinmeyen Kullanıcı";
          if (answer === questionData.correct) {
            correctUsers.push(display);
          } else {
            incorrectUsers.push(display);
          }
        });

        const resultEmbed = new MessageEmbed()
          .setTitle(`${emojis.bot.succes} | Bilgi Sorusu Sonucu`)
          .setDescription(`**Doğru Cevap:** ${questionData.correct}`)
          .addFields(
            {
              name: "Doğru Cevap Verenler:",
              value: correctUsers.length > 0 ? correctUsers.join("\n") : "Kimse doğru cevap vermedi.",
            },
            {
              name: "Yanlış Cevap Verenler:",
              value: incorrectUsers.length > 0 ? incorrectUsers.join("\n") : "Kimse yanlış cevap vermedi.",
            }
          )
          .setColor("GREEN")
          .setFooter({ text: "Süre doldu. Cevaplar sıralandı." })
          .setTimestamp();

        await message.channel.send({ embeds: [resultEmbed] });
        await sentMessage.edit({ components: [] }).catch(() => {});
      } catch (err) {
        console.error("Collector end hatası:", err);
        await message.channel.send(`${emojis.bot.error} | Oopsie, sonuçlar hesaplanırken bir aksaklık oldu~`);
        await sentMessage.edit({ components: [] }).catch(() => {});
      }
    });

    questions.splice(randomIndex, 1); // Kullanılan soruyu listeden çıkar
  } catch (error) {
    console.error("bilgisorusu komutu hatası:", error);
    return message.reply(`${emojis.bot.error} | Ayy, bir sorun çıktı~ Lütfen biraz sonra tekrar deneyebilir misin?`);
  }
};

exports.help = {
  name: "bilgisorusu",
  aliases: ["triviasoru", "bsoru"],
  usage: "bilgisorusu",
  description: "Türkçe bilgi sorusu sorar.",
  category: "Eğlence",
  cooldown: 5,
};
