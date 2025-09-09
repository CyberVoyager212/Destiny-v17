const { MessageEmbed, MessageActionRow, MessageButton } = require("discord.js");
const botConfig = require("../botConfig");
const emojis = require("../emoji.json");

exports.execute = async (client, message, args) => {
  if (!botConfig.admins.includes(message.author.id)) {
    return message.reply(
      `${emojis.bot.error} | **${message.member.displayName}**, bu büyüyü kullanmaya yetkin yok qwq~ \n> Sadece ustalara izin var desu~`
    );
  }

  try {
    const guilds = client.guilds.cache.map((g) => g).slice(0, 10);
    if (guilds.length === 0) {
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, şu anda bağlı olduğum hiç sunucu yok gibi görünüyor :c`
      );
    }

    const nums = ["1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣","🔟"];

    let embed = new MessageEmbed()
      .setTitle(`${emojis.bot.succes} | Sunucular`)
      .setColor("BLUE")
      .setTimestamp()
      .addFields(
        guilds.map((g, i) => ({
          name: `${nums[i]} ${g.name}`,
          value: `👥 Üyeler: **${g.memberCount}**`,
          inline: true,
        }))
      );

    let row = new MessageActionRow();
    guilds.forEach((g, i) => {
      row.addComponents(
        new MessageButton()
          .setCustomId(`leave_${i}`)
          .setLabel(nums[i])
          .setStyle("DANGER")
      );
    });

    const sent = await message.channel.send({
      embeds: [embed],
      components: [row],
    });

    const collector = sent.createMessageComponentCollector({ time: 20000 });

    collector.on("collect", async (i) => {
      if (i.user.id !== message.author.id) {
        return i.reply({
          content: `${emojis.bot.error} | **${i.user.username}**, bu butona basamazsın uwu~ \n> Sadece büyüyü çağıran kişi dokunabilir desu~`,
          ephemeral: true,
        });
      }

      const idx = parseInt(i.customId.split("_")[1]);
      const targetGuild = guilds[idx];
      if (!targetGuild) {
        return i.reply({
          content: `${emojis.bot.error} | **${message.member.displayName}**, böyle bir sunucu bulamadım qwq~`,
          ephemeral: true,
        });
      }

      try {
        await targetGuild.leave();
        await i.reply({
          content: `${emojis.bot.succes} | **${targetGuild.name}** sunucusundan ayrıldım~ owo`,
          ephemeral: true,
        });
      } catch (err) {
        await i.reply({
          content: `${emojis.bot.error} | **${message.member.displayName}**, ayrılırken işler ters gitti qwq~ \n> Hata: \`${err.message}\``,
          ephemeral: true,
        });
      }
      collector.stop();
    });

    collector.on("end", () => {
      sent.edit({ components: [] }).catch(() => {});
    });
  } catch (err) {
    message.reply(
      `${emojis.bot.error} | **${message.member.displayName}**, büyü sırasında bir hata oldu qwq~ \n> Hata: \`${err.message}\``
    );
  }
};

exports.help = {
  name: "sunucular",
  aliases: ["servers"],
  usage: "sunucular",
  description: "Bağlı olduğum sunuculardan birini seçip ayrılmanıza imkân tanır.",
  category: "Bot",
  cooldown: 10,
  admin: true,
};
