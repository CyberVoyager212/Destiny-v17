const { MessageEmbed, MessageActionRow, MessageButton } = require("discord.js");
const fs = require("fs");
const path = require("path");
const emojis = require("../emoji.json");

const filePath = path.join(__dirname, "../utils/autotranslateforusers.json");

function loadJSON() {
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch (err) {
    console.error("JSON yüklenemedi:", err);
    return {};
  }
}

function saveJSON(data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function getUserLang(userId) {
  const data = loadJSON();
  return data[userId] || null;
}

function setUserLang(userId, lang) {
  const data = loadJSON();
  data[userId] = lang;
  saveJSON(data);
}

function deleteUserLang(userId) {
  const data = loadJSON();
  delete data[userId];
  saveJSON(data);
}

exports.execute = async (client, message, args) => {
  try {
    const userId = message.author.id;
    const lang = args[0];

    if (!lang) {
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, lütfen bir dil kodu yaz~ Örnek: \`autotranslate en\` veya kapatmak için \`autotranslate off\``
      );
    }

    if (lang.length > 10) {
      return message.reply(`${emojis.bot.error} | Geçersiz dil kodu girdin~`);
    }

    if (lang.toLowerCase() === "off") {
      const cur = getUserLang(userId);
      if (!cur)
        return message.reply(
          `${emojis.bot.error} | Auto-translate zaten kapalı~`
        );
      deleteUserLang(userId);
      return message.reply(
        `${emojis.bot.succes} | Auto-translate başarıyla kapatıldı! Artık mesajların otomatik çevrilmeyecek~`
      );
    }

    const embed = new MessageEmbed()
      .setTitle("Auto-Translate — Onay Gerekiyor")
      .setDescription(
        `🌸 **Anime-Style Uyarı:**\n**${message.member.displayName}**, hesabın için auto-translate etkinleştirilecek! Seçilen dil: **${lang}**.\n\n⚠️ Bazı mesajlar çevrilmeyebilir, bot 160+ komut içeriyor. Anlaman için uyarıyoruz!`
      )
      .setColor("YELLOW")
      .setFooter({
        text: "⏱ 30 saniye içinde butona tıklamazsan işlem iptal edilir~",
      });

    const row = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId("autotrans_confirm")
        .setLabel("Etkinleştir")
        .setStyle("SUCCESS"),
      new MessageButton()
        .setCustomId("autotrans_cancel")
        .setLabel("İptal")
        .setStyle("DANGER")
    );

    const warnMsg = await message.channel.send({
      embeds: [embed],
      components: [row],
    });

    const filter = (i) =>
      i.user.id === message.author.id &&
      ["autotrans_confirm", "autotrans_cancel"].includes(i.customId);

    const collector = warnMsg.createMessageComponentCollector({
      filter,
      max: 1,
      time: 30000,
    });

    collector.on("collect", async (interaction) => {
      try {
        if (interaction.customId === "autotrans_confirm") {
          setUserLang(userId, lang);
          const okEmbed = new MessageEmbed()
            .setTitle(`${emojis.bot.succes} Auto-Translate Etkin!`)
            .setDescription(
              `🎉 Tebrikler **${message.member.displayName}**! Artık mesajların otomatik olarak **${lang}** diline çevrilecek~`
            )
            .setColor("GREEN");

          await interaction.update({ embeds: [okEmbed], components: [] });
        } else {
          const cancelEmbed = new MessageEmbed()
            .setTitle(`${emojis.bot.error} İşlem İptal Edildi!`)
            .setDescription(
              `❌ **${message.member.displayName}**, auto-translate kurulumu iptal edildi~`
            )
            .setColor("RED");

          await interaction.update({ embeds: [cancelEmbed], components: [] });
        }
      } catch (err) {
        console.error("autotranslate button handler error:", err);
        await interaction.update({
          content: `${emojis.bot.error} | Bir hata oluştu~ Lütfen tekrar dene!`,
          components: [],
        });
      }
    });

    collector.on("end", async (collected) => {
      if (collected.size === 0) {
        const timeoutEmbed = new MessageEmbed()
          .setTitle(`${emojis.bot.error} Zaman Aşımı!`)
          .setDescription(
            `⌛ **${message.member.displayName}**, 30 saniye içinde onay vermedin~ Auto-translate iptal edildi.`
          )
          .setColor("ORANGE");
        try {
          await warnMsg.edit({ embeds: [timeoutEmbed], components: [] });
        } catch {}
      }
    });
  } catch (error) {
    console.error("autotranslate command error:", error);
    return message.reply(
      `${emojis.bot.error} | **${message.member.displayName}**, beklenmedik bir hata oluştu~ 😢 Lütfen tekrar dene!`
    );
  }
};

exports.help = {
  name: "autotranslate",
  aliases: ["atranslate", "autot"],
  usage: "autotranslate <lang_code|off>",
  description:
    "Hesabınız için auto-translate açıp kapatır. Onay için buton kullanılır.",
  category: "Araçlar",
  cooldown: 3,
};
