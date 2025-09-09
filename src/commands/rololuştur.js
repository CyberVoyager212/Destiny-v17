const { MessageEmbed } = require("discord.js");
const emojis = require("../emoji.json");

exports.help = {
  name: "rololuştur",
  aliases: ["rololuştur"],
  usage: "rololuştur help\nrololuştur <isim> [renk(hex)] [izin1,izin2,...]",
  description:
    "Yeni bir rol oluşturur. `help` ile izinler ve renk formatlarını görebilirsin.",
  category: "Moderasyon",
  cooldown: 5,
  permissions: ["MANAGE_ROLES"],
};

exports.execute = async (client, message, args) => {
  try {
    if (!message.member.permissions.has("MANAGE_ROLES"))
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, üzgünüm ama bunu yapmak için \`Rolleri Yönet\` yetkisine sahip olmalısın~ :c`
      );

    if (args[0] === "help") {
      return message.channel.send({
        embeds: [
          new MessageEmbed()
            .setTitle(`${emojis.bot.succes} rololuştur Kullanımı`)
            .setDescription(this.help.usage)
            .addField(
              "Geçerli İzinler",
              Object.keys(require("discord.js").Permissions.FLAGS).join(", ")
            )
            .addField("Renk Örneği", "`#FF0000`, `BLUE`, `RANDOM`")
            .setColor("#00AAFF"),
        ],
      });
    }

    const [isim, renk = "DEFAULT", izinler = ""] = args;
    if (!isim) {
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, lütfen rol için bir isim gir~ :c`
      );
    }

    const perms = izinler.split(",").filter((i) => i);

    const rol = await message.guild.roles.create({
      name: isim,
      color: renk,
      permissions: perms,
    });

    return message.channel.send(
      `${emojis.bot.succes} | **${message.member.displayName}**, rol başarıyla oluşturuldu: ${rol} (Renk: ${renk}, İzinler: ${
        perms.join(", ") || "–"
      }) ✨`
    );
  } catch (e) {
    console.error("rololuştur komutu hata:", e);
    return message.reply(
      `${emojis.bot.error} | **${message.member.displayName}**, uf! Rol oluşturulurken bir sorun çıktı... lütfen biraz bekleyip tekrar dene~ :c`
    );
  }
};
