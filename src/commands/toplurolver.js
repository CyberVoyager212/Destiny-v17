const { MessageEmbed, MessageActionRow, MessageButton } = require("discord.js");
const emojis = require("../emoji.json");

exports.execute = async (client, message, args) => {
  try {
    if (!message.member.permissions.has("MANAGE_ROLES")) {
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, üzgünüm qwq~ bu komutu kullanmaya yetkin yok...`
      );
    }

    if (!message.guild.me.permissions.has("MANAGE_ROLES")) {
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, bana \`Rolleri Yönet\` izni verilmemiş :c`
      );
    }

    const role = message.mentions.roles.first();
    if (!role) {
      return message.reply(
        `${emojis.bot.error} | Lütfen bir rol etiketle~ \`toplurolver @rol\``
      );
    }

    const members = await message.guild.members.fetch();
    const toProcess = members.filter(
      (m) => !m.user.bot && !m.roles.cache.has(role.id)
    );
    const total = toProcess.size;

    if (total === 0) {
      return message.reply(
        `${emojis.bot.error} | İşlem yapılacak üye bulunamadı qwq...`
      );
    }

    const embed = new MessageEmbed()
      .setTitle("🎀 Toplu Rol Verme")
      .setDescription(
        `Butonla **${role.name}** rolünü **${total}** üyeye vermeyi onaylayın~`
      )
      .setColor("#5865F2");

    const row = new MessageActionRow().addComponents(
      new MessageButton().setCustomId("execute").setLabel("Uygula").setStyle("SUCCESS"),
      new MessageButton().setCustomId("cancel").setLabel("İptal").setStyle("DANGER")
    );

    const prompt = await message.channel.send({ embeds: [embed], components: [row] });
    const filter = (i) => i.user.id === message.author.id;
    let interaction;

    try {
      interaction = await prompt.awaitMessageComponent({ filter, time: 20000 });
    } catch {
      await prompt.edit({ components: [] });
      return message.channel.send(`${emojis.bot.error} | ⏳ Süre doldu, işlem iptal edildi.`);
    }

    await interaction.deferUpdate();
    if (interaction.customId === "cancel") {
      return prompt.edit({
        components: [],
        embeds: [embed.setDescription(`${emojis.bot.error} | ❌ İşlem iptal edildi~`)],
      });
    }

    const startTime = Date.now();
    let success = 0;
    let failed = 0;

    for (const member of toProcess.values()) {
      try {
        await member.roles.add(role);
        success++;
      } catch {
        failed++;
        continue;
      }
    }

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    const finalEmbed = new MessageEmbed()
      .setTitle("✨ Toplu Rol Verme - Tamamlandı")
      .setColor("#00FF00")
      .setDescription(
        `${emojis.bot.succes} | Başarıyla rol verilen üye: **${success}/${total}**\n` +
        `${emojis.bot.error} | Rol verilirken hata oluşan üye: **${failed}/${total}**`
      )
      .setFooter(`İşlem Süresi: ${totalTime} saniye`);

    await prompt.edit({ embeds: [finalEmbed], components: [] });
  } catch (err) {
    console.error("Toplu rol verme hatası:", err);
    return message.reply(
      `${emojis.bot.error} | **${message.member.displayName}**, işler biraz karıştı qwq~ tekrar denemeyi düşünür müsün?`
    );
  }
};

exports.help = {
  name: "toplurolver",
  aliases: ["trolver", "giveallrole"],
  usage: "toplurolver @rol",
  description: "Sunucudaki tüm üyeler için belirtilen rolü topluca verir.",
  category: "Moderasyon",
  cooldown: 10,
  permissions: ["MANAGE_ROLES"],
};
