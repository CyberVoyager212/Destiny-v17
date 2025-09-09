const { MessageActionRow, MessageButton, MessageEmbed } = require("discord.js");
const emojis = require("../emoji.json"); // emoji verilerini içe aktar

exports.help = {
  name: "denetimkaydı",
  aliases: ["dk"],
  usage: "denetimkaydı",
  description: "Son 50 denetim kaydını şık bir embed ve sayfa butonları ile listeler.",
  category: "Moderasyon",
  cooldown: 10,
};

exports.execute = async (client, message, args) => {
  const guild = message.guild;

  if (!guild)
    return message.reply(
      `${emojis.bot.error} | Ooops~ **${message.member.displayName}**, bu komut sadece sunucularda kullanılabilir 😵`
    );

  try {
    const logs = await guild.fetchAuditLogs({ limit: 50 });
    const entries = logs.entries.map((entry) => {
      const user = entry.executor?.tag || "Bilinmiyor";
      const action = entry.action;
      const target =
        entry.target?.tag || entry.target?.name || entry.target?.id || "Bilinmiyor";
      const reason = entry.reason || "Sebep belirtilmemiş";
      return `**👤 Kullanıcı:** ${user}\n**⚡ Eylem:** ${action}\n**🎯 Hedef:** ${target}\n**📝 Sebep:** ${reason}`;
    });

    if (entries.length === 0)
      return message.channel.send(
        `${emojis.bot.error} | Hımm~ **${message.member.displayName}**, denetim kaydı bulunamadı :c`
      );

    let currentPage = 0;
    const perPage = 5;
    const maxPage = Math.ceil(entries.length / perPage) - 1;

    const createEmbed = (page) => {
      const start = page * perPage;
      const slice = entries.slice(start, start + perPage);
      return new MessageEmbed()
        .setColor("#2f3136")
        .setTitle(`${emojis.bot.succes} 📋 ${guild.name} Denetim Kayıtları`)
        .setDescription(slice.map((log, i) => `**${start + i + 1}.**\n${log}`).join("\n\n"))
        .setFooter({
          text: `Sayfa ${page + 1}/${maxPage + 1}`,
          iconURL: guild.iconURL({ dynamic: true }),
        });
    };

    const row = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId("back")
        .setLabel("⬅️ Geri")
        .setStyle("PRIMARY")
        .setDisabled(true),
      new MessageButton()
        .setCustomId("next")
        .setLabel("➡️ İleri")
        .setStyle("PRIMARY")
        .setDisabled(maxPage === 0),
      new MessageButton()
        .setCustomId("close")
        .setLabel("❌ Kapat")
        .setStyle("DANGER")
    );

    const msg = await message.channel.send({
      embeds: [createEmbed(currentPage)],
      components: [row],
    });

    const filter = (i) => i.user.id === message.author.id;
    const collector = msg.createMessageComponentCollector({ filter, time: 60000 });

    collector.on("collect", async (interaction) => {
      if (interaction.customId === "next" && currentPage < maxPage) currentPage++;
      if (interaction.customId === "back" && currentPage > 0) currentPage--;
      if (interaction.customId === "close") {
        collector.stop("closed");
        return interaction.update({ components: [] });
      }

      await interaction.update({
        embeds: [createEmbed(currentPage)],
        components: [
          new MessageActionRow().addComponents(
            new MessageButton()
              .setCustomId("back")
              .setLabel("⬅️ Geri")
              .setStyle("PRIMARY")
              .setDisabled(currentPage === 0),
            new MessageButton()
              .setCustomId("next")
              .setLabel("➡️ İleri")
              .setStyle("PRIMARY")
              .setDisabled(currentPage === maxPage),
            new MessageButton()
              .setCustomId("close")
              .setLabel("❌ Kapat")
              .setStyle("DANGER")
          ),
        ],
      });
    });

    collector.on("end", (_, reason) => {
      if (reason !== "closed") {
        msg.edit({ components: [] }).catch(() => {});
      }
    });
  } catch (err) {
    console.error(err);
    message.reply(
      `${emojis.bot.error} | Ooops~ Denetim kaydına erişirken bir hata oluştu, **${message.member.displayName}** 😵`
    );
  }
};
