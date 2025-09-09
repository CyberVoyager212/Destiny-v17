const { MessageEmbed } = require("discord.js");
const emojis = require("../emoji.json");

module.exports = {
  name: "trendanalysis",
  description: "Sunucudaki mesaj aktivitelerini analiz eder.",
  aliases: ["trends", "activity"],
  usage: "trendanalysis",

  async execute(client, message, args) {
    try {
      if (!message.guild) {
        return message.reply(
          `${emojis.bot.error} | **${message.member.displayName}**, bu komut sadece sunucularda kullanılabilir~`
        );
      }

      let guildKey = `messageLogs_${message.guild.id}`;
      let messageLogs = (await client.db.get(guildKey)) || [];

      if (!messageLogs.length) {
        return message.reply(
          `${emojis.bot.error} | **${message.member.displayName}**, henüz yeterli veri yok qwq~ Mesajlar kaydedildikçe analiz yapılabilir!`
        );
      }

      let hourlyActivity = new Array(24).fill(0);

      messageLogs.forEach((log) => {
        let hour = (new Date(log.timestamp).getUTCHours() + 3) % 24;
        hourlyActivity[hour]++;
      });

      const activityText = hourlyActivity
        .map((count, hour) => `${hour}:00 - ${hour + 1}:00 ➝ **${count}** mesaj`)
        .join("\n");

      const embed = new MessageEmbed()
        .setTitle(`${emojis.bot.succes} Sunucu Mesaj Trend Analizi`)
        .setDescription(activityText)
        .setColor("#00FF00")
        .setFooter({ text: `Analiz talep eden: ${message.member.displayName}` })
        .setTimestamp();

      return message.channel.send({ embeds: [embed] });
    } catch (err) {
      console.error("TrendAnalysis Hata:", err);
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, analiz sırasında bir hata oluştu~ Lütfen tekrar deneyin!`
      );
    }
  },

  help: {
    name: "trendanalysis",
    aliases: ["trends", "activity"],
    usage: "trendanalysis",
    description:
      "Sunucudaki mesaj aktivitelerini embed ile analiz eder. Webhook mesajları da dahildir.",
    category: "Moderasyon",
    cooldown: 5,
  },
};
