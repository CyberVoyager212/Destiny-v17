const { MessageEmbed, MessageActionRow, MessageButton } = require("discord.js");
const emojis = require("../emoji.json");

exports.execute = async (client, message, args) => {
  if (!message.member.permissions.has("MANAGE_NICKNAMES")) {
    return message.reply(
      `${emojis.bot.error} | **${message.member.displayName}**, üzgünüm qwq~ bu komutu kullanmaya yetkin yok...`
    );
  }

  if (!message.guild.me.permissions.has("MANAGE_NICKNAMES")) {
    return message.reply(
      `${emojis.bot.error} | **${message.member.displayName}**, bana \`Üyelerin Takma Adlarını Yönet\` iznini verir misin? Yoksa sihir yapamıyorum :c`
    );
  }

  const nickname = args.join(" ");
  if (!nickname) {
    return message.reply(
      `${emojis.bot.error} | **${message.member.displayName}**, lütfen yeni takma adı yaz~ \n> Örnek: \`topluadver <yeni_ad>\``
    );
  }

  const members = await message.guild.members.fetch();
  const toProcess = members.filter((m) => !m.user.bot);
  const total = toProcess.size;
  if (total === 0)
    return message.reply(
      `${emojis.bot.error} | **${message.member.displayName}**, hiç üye bulamadım qwq...`
    );

  const embed = new MessageEmbed()
    .setTitle("🌸 Toplu Takma Ad Verme")
    .setDescription(
      `**${message.member.displayName}**, toplam **${total}** üyeye \`${nickname}\` takma adını vermek üzeresin~ onaylıyor musun?`
    )
    .setColor("#5865F2");

  const row = new MessageActionRow().addComponents(
    new MessageButton()
      .setCustomId("execute")
      .setLabel("✨ Uygula")
      .setStyle("SUCCESS"),
    new MessageButton()
      .setCustomId("cancel")
      .setLabel("❌ İptal")
      .setStyle("DANGER")
  );

  const prompt = await message.channel.send({ embeds: [embed], components: [row] });
  const filter = (i) => i.user.id === message.author.id;
  let interaction;

  try {
    interaction = await prompt.awaitMessageComponent({ filter, time: 20000 });
  } catch {
    await prompt.edit({ components: [] });
    return message.channel.send(
      `⏱ | **${message.member.displayName}**, biraz geç kaldın~ süre doldu ve işlem iptal edildi :c`
    );
  }

  await interaction.deferUpdate();
  if (interaction.customId === "cancel") {
    return prompt.edit({
      components: [],
      embeds: [embed.setDescription(`${emojis.bot.error} | İşlem iptal edildi~`)],
    });
  }

  const startTime = Date.now();
  let success = 0;
  let failed = 0;

  const progressEmbed = new MessageEmbed()
    .setTitle("⏳ Toplu Takma Ad İşlemi")
    .setDescription(`0/${total} üye işlendi...`)
    .addField(`${emojis.bot.succes} Başarılı`, "0", true)
    .addField(`${emojis.bot.error} Başarısız`, "0", true)
    .setFooter("İşlem başladı, biraz sabır lütfen~ uwu");

  const progressMessage = await prompt.edit({
    embeds: [progressEmbed],
    components: [],
  });

  try {
    const memberPromises = toProcess.map(async (member, index) => {
      try {
        await member.setNickname(nickname);
        success++;
      } catch {
        failed++;
      }

      if ((index + 1) % 10 === 0 || index + 1 === total) {
        const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
        const updatedEmbed = new MessageEmbed()
          .setTitle("⏳ Toplu Takma Ad İşlemi")
          .setDescription(`${success + failed}/${total} üye işlendi...`)
          .addField(`${emojis.bot.succes} Başarılı`, `${success}`, true)
          .addField(`${emojis.bot.error} Başarısız`, `${failed}`, true)
          .setFooter(`Geçen süre: ${totalTime}s ~ sabırlı ol :3`);

        await progressMessage.edit({ embeds: [updatedEmbed] });
      }
    });

    await Promise.all(memberPromises);

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    const finalEmbed = new MessageEmbed()
      .setTitle("🎉 Toplu Takma Ad İşlemi Tamamlandı")
      .setColor("#00FF00")
      .setDescription(
        `${emojis.bot.succes} | **${success}/${total}** üyeye takma adı verdim~`
      )
      .addField(`${emojis.bot.succes} Başarılı`, `${success}`, true)
      .addField(`${emojis.bot.error} Başarısız`, `${failed}`, true)
      .setFooter(`Toplam süre: ${totalTime}s ~ yoruldum ama mutluyum :3`);

    await prompt.edit({ embeds: [finalEmbed], components: [] });
  } catch (err) {
    console.error("Takma ad verme işlemi sırasında hata oluştu:", err);
    return prompt.edit({
      components: [],
      embeds: [
        embed.setDescription(
          `${emojis.bot.error} | **${message.member.displayName}**, işler biraz karıştı qwq~ tekrar denemeyi düşünür müsün?`
        ),
      ],
    });
  }
};

exports.help = {
  name: "topluadver",
  aliases: ["tadver", "nickall"],
  usage: "topluadver <yeni_ad>",
  description:
    "Sunucudaki tüm (aktif ve çevrimdışı) üyelere aynı takma adı verir.",
  category: "Moderasyon",
  cooldown: 10,
  permissions: ["MANAGE_NICKNAMES"],
};
