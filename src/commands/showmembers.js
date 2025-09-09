const { Permissions, MessageAttachment } = require("discord.js");
const fs = require("fs");
const path = require("path");
const emojis = require("../emoji.json");

exports.execute = async (client, message, args) => {
  if (!message.member.permissions.has(Permissions.FLAGS.VIEW_AUDIT_LOG)) {
    return message.reply(
      `${emojis.bot.error} | **${message.member.displayName}**, uf! Bu komutu kullanmak için yetkin yok~ :c`
    );
  }

  const infoMsg = await message.reply(
    `${emojis.bot.succes} | **${message.member.displayName}**, üyeler yükleniyor~ büyük sunucularda biraz sürebilir ⏱`
  );

  try {
    const membersCollection = await message.guild.members.fetch();
    const members = membersCollection.map((m) => `${m.user.tag} (${m.id})`);

    if (!members.length) {
      return infoMsg.edit(
        `${emojis.bot.error} | Sunucuda hiç üye bulunamadı~ :c`
      );
    }

    const fileName = `uyeler_${message.guild.id}.txt`;
    const filePath = path.join(__dirname, "..", "temp", fileName);

    const tempDir = path.join(__dirname, "..", "temp");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

    fs.writeFileSync(filePath, members.join("\n"), "utf8");

    const attachment = new MessageAttachment(filePath);

    await message.channel.send({
      content: `${emojis.bot.succes} | Toplam **${members.length} üye bulundu**!\nAşağıdan sunucunun üyelerini .txt olarak indirebilirsin ✨`,
      files: [attachment],
    });

    await infoMsg.delete();

    setTimeout(() => {
      fs.unlink(filePath, (err) => {
        if (err) console.error(`${emojis.bot.error} | Dosya silinemedi:`, err);
      });
    }, 10000);
  } catch (err) {
    console.error(err);
    infoMsg.edit(
      `${emojis.bot.error} | **${message.member.displayName}**, uf! Üyeler alınırken bir hata oluştu~ :c`
    );
  }
};

exports.help = {
  name: "showmembers",
  aliases: ["üyeler"],
  usage: "showmembers",
  description:
    "Sunucudaki tüm üyelerin (çevrimdışı dahil) tag ve ID bilgilerini listeler ve .txt olarak indirmenizi sağlar.",
  category: "Araçlar",
  cooldown: 10,
  permissions: ["VIEW_AUDIT_LOG"],
};
