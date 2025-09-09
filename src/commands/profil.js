const { MessageEmbed } = require("discord.js");
const emojis = require("../emoji.json");

exports.execute = async (client, message, args) => {
  const subcommand = args[0];
  if (!subcommand) {
    return message.reply(
      `${emojis.bot.error} | **${message.member.displayName}**, bir alt komut belirtmelisin~ (işleme / sil / göster) :c`
    );
  }

  if (subcommand.toLowerCase() === "işleme") {
    const dataString = args.slice(1).join(" ");
    const parts = dataString.split(";").map((p) => p.trim());

    if (parts.length < 13) {
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, eksik alan var~ Tüm 13 alanı noktalı virgülle (;) ayırarak gir :c`
      );
    }

    const userInfo = {
      yas: parts[0] || "Veri yok",
      isim: parts[1] || "Veri yok",
      soyisim: parts[2] || "Veri yok",
      hakkimda: parts[3] || "Veri yok",
      sevdigimOyuncu: parts[4] || "Veri yok",
      sevdigimYemek: parts[5] || "Veri yok",
      sevdigimRenk: parts[6] || "Veri yok",
      sevdigimHobi: parts[7] || "Veri yok",
      sevdigimHayvan: parts[8] || "Veri yok",
      sevdigimFilm: parts[9] || "Veri yok",
      sevdigimSarki: parts[10] || "Veri yok",
      dogumGunum: parts[11] || "Veri yok",
      aktiflik: parts[12] || "Veri yok",
    };

    if (userInfo.yas !== "Veri yok" && !/^\d{1,3}$/.test(userInfo.yas)) {
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, yaş sadece rakamlardan oluşmalı ve en fazla 3 hane olabilir~ lütfen düzelt :c`
      );
    }

    if (
      userInfo.isim !== "Veri yok" &&
      (!/^[a-zA-ZçğıöşüÇĞİÖŞÜ\s]+$/.test(userInfo.isim) || userInfo.isim.length > 50)
    ) {
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, isim yalnızca harf içermeli ve 50 karakteri geçmemeli~`
      );
    }

    if (
      userInfo.soyisim !== "Veri yok" &&
      (!/^[a-zA-ZçğıöşüÇĞİÖŞÜ\s]+$/.test(userInfo.soyisim) || userInfo.soyisim.length > 50)
    ) {
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, soyisim yalnızca harf içermeli ve 50 karakteri geçmemeli~`
      );
    }

    if (userInfo.hakkimda.length > 250) {
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, 'hakkımda' 250 karakteri aşamaz~ biraz kısaltır mısın? :c`
      );
    }

    if (userInfo.aktiflik !== "Veri yok" && !/^\d{1,2}$/.test(userInfo.aktiflik)) {
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, aktiflik sadece sayı olmalı ve en fazla 2 hane olabilir~`
      );
    }

    try {
      await client.db.set(`profile_${message.author.id}`, userInfo);
      return message.reply(
        `${emojis.bot.succes} | **${message.member.displayName}**, profil bilgilerin başarıyla kaydedildi! 🌟`
      );
    } catch (error) {
      console.error("Profil kaydetme hatası:", error);
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, uf! Profil kaydedilemedi... sonra tekrar dene~ :c`
      );
    }
  } else if (subcommand.toLowerCase() === "sil") {
    try {
      await client.db.delete(`profile_${message.author.id}`);
      return message.reply(
        `${emojis.bot.succes} | **${message.member.displayName}**, profilin başarıyla silindi! ✨`
      );
    } catch (error) {
      console.error("Profil silme hatası:", error);
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, profil silinirken bir sorun oldu... biraz bekle sonra tekrar dene :c`
      );
    }
  } else if (subcommand.toLowerCase() === "göster") {
    let member =
      message.mentions.members?.first() ||
      message.guild.members.cache.get(args[1]) ||
      message.member;

    try {
      const profile = await client.db.get(`profile_${member.id}`);

      if (!profile) {
        return message.reply(
          `${emojis.bot.error} | **${message.member.displayName}**, bu kullanıcının profili bulunamadı~ belki henüz kaydetmemiş? :c`
        );
      }

      const embed = new MessageEmbed()
        .setTitle(`${member.user.tag} — Profil`)
        .setColor("#00BFA5")
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .addField("Yaş", profile.yas, true)
        .addField("İsim", profile.isim, true)
        .addField("Soyisim", profile.soyisim, true)
        .addField("Hakkımda", profile.hakkimda || "Veri yok")
        .addField("En Sevdiğim Oyuncu", profile.sevdigimOyuncu || "Veri yok", true)
        .addField("En Sevdiğim Yemek", profile.sevdigimYemek || "Veri yok", true)
        .addField("En Sevdiğim Renk", profile.sevdigimRenk || "Veri yok", true)
        .addField("En Sevdiğim Hobi", profile.sevdigimHobi || "Veri yok", true)
        .addField("En Sevdiğim Hayvan", profile.sevdigimHayvan || "Veri yok", true)
        .addField("En Sevdiğim Film", profile.sevdigimFilm || "Veri yok", true)
        .addField("En Sevdiğim Şarkı", profile.sevdigimSarki || "Veri yok", true)
        .addField("Doğum Günü", profile.dogumGunum || "Veri yok", true)
        .addField("Aktiflik", profile.aktiflik || "Veri yok", true)
        .setFooter({
          text: `Görüntüleyen: ${message.member.displayName}`,
          iconURL: message.author.displayAvatarURL({ dynamic: true }),
        })
        .setTimestamp();

      return message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error("Profil gösterme hatası:", error);
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, profil görüntülenirken bir hata oldu... sonra tekrar dene~ :c`
      );
    }
  } else {
    return message.reply(
      `${emojis.bot.error} | **${message.member.displayName}**, geçersiz alt komut! (işleme / sil / göster) :c`
    );
  }
};

exports.help = {
  name: "hakkımda",
  aliases: ["profile", "kimlik"],
  usage: "hakkımda <işleme | sil | göster> [veriler veya kullanıcı]",
  description: "Kullanıcı hakkında bilgileri kaydeder, siler veya gösterir.",
  category: "Araçlar",
  cooldown: 10,
};
