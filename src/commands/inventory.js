const { MessageEmbed, MessageActionRow, MessageButton } = require("discord.js");
const emojis = require("../emoji.json");

function chooseEmoji(amount) {
  if (amount > 100000) return emojis.money.high;
  if (amount > 10000) return emojis.money.medium;
  return emojis.money.low;
}

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

exports.execute = async (client, message, args) => {
  try {
    const user = message.author;
    const inventoryKey = `inventory_${user.id}`;
    let items = await client.db.get(inventoryKey);

    if (!Array.isArray(items) || items.length === 0) {
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, envanterin boş... Biraz daha avlanmalısın~ >///<`
      );
    }

    const itemCounts = {};
    let totalValue = 0;
    for (const item of items) {
      if (!item) continue;
      const emoji = item.emoji || "❓";
      const name = item.name || "Bilinmeyen";
      const value = Number(item.value) || 0;
      totalValue += value;
      const key = `${emoji} ${name}`;
      itemCounts[key] = (itemCounts[key] || 0) + 1;
    }

    const entries = Object.entries(itemCounts).sort((a, b) => b[1] - a[1]);
    const pages = chunkArray(entries, 24);

    let currentPage = 0;

    const generateEmbed = (pageIndex) => {
      const page = pages[pageIndex];
      const embed = new MessageEmbed()
        .setTitle(`${emojis.bot.succes} | ${user.username}'in Envanteri` + (pages.length > 1 ? ` (Sayfa ${pageIndex + 1}/${pages.length})` : ""))
        .setColor("#00B0F4")
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .setTimestamp();

      page.forEach(([itemName, count]) => {
        embed.addField(itemName, `Miktar: **${count}**`, true);
      });

      if (pageIndex === pages.length - 1) {
        const gainEmoji = chooseEmoji(totalValue);
        embed.addField(`${gainEmoji} Toplam Envanter Değeri`, `**${totalValue}**`, false);
      }

      return embed;
    };

    const row = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId("prev")
        .setLabel("◀️")
        .setStyle("SECONDARY")
        .setDisabled(true),
      new MessageButton()
        .setCustomId("next")
        .setLabel("▶️")
        .setStyle("SECONDARY")
        .setDisabled(pages.length <= 1)
    );

    const embedMessage = await message.channel.send({ embeds: [generateEmbed(currentPage)], components: [row] });

    if (pages.length <= 1) return;

    const collector = embedMessage.createMessageComponentCollector({
      filter: (i) => i.user.id === user.id,
      time: 60000
    });

    collector.on("collect", async (interaction) => {
      if (!interaction.isButton()) return;

      if (interaction.customId === "next") currentPage++;
      else if (interaction.customId === "prev") currentPage--;

      const newRow = new MessageActionRow().addComponents(
        new MessageButton()
          .setCustomId("prev")
          .setLabel("◀️")
          .setStyle("SECONDARY")
          .setDisabled(currentPage === 0),
        new MessageButton()
          .setCustomId("next")
          .setLabel("▶️")
          .setStyle("SECONDARY")
          .setDisabled(currentPage === pages.length - 1)
      );

      await interaction.update({ embeds: [generateEmbed(currentPage)], components: [newRow] });
    });

    collector.on("end", async () => {
      const disabledRow = new MessageActionRow().addComponents(
        new MessageButton()
          .setCustomId("prev")
          .setLabel("◀️")
          .setStyle("SECONDARY")
          .setDisabled(true),
        new MessageButton()
          .setCustomId("next")
          .setLabel("▶️")
          .setStyle("SECONDARY")
          .setDisabled(true)
      );
      embedMessage.edit({ components: [disabledRow] });
    });
  } catch (error) {
    console.error("🛑 inventory komutu hata:", error);
    return message.reply(
      `${emojis.bot.error} | **${message.member.displayName}**, biraz hmmm... bir şeyler ters gitti :c Lütfen sonra tekrar dene.`
    );
  }
};

exports.help = {
  name: "inventory",
  aliases: ["env"],
  usage: "inventory",
  description: "Envanterinizdeki eşyaları listeler ve sayfalarla gösterir.",
  category: "Ekonomi",
  cooldown: 5,
};
