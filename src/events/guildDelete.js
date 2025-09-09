const { MessageEmbed } = require("discord.js");
const botConfig = require("../botConfig.js");

module.exports = async (client, guild) => {
  const toplamSunucu = client.guilds.cache.size;
  const toplamKullanici = client.users.cache.size;

  const EmbedCikis = new MessageEmbed()
    .setColor("RED")
    .setTitle(`❌ Bir Sunucudan Ayrıldım!`)
    .setDescription(
      `
**📌 Ayrıldığım Sunucu:**  
🏠 **Sunucu Adı:** ${guild.name}  
👑 **Sahibi:** <@${guild.ownerId}>  
👥 **Son Üye Sayısı:** ${guild.memberCount}  
🆔 **Sunucu ID:** ${guild.id}  

**🌍 Güncel Bilgiler:**  
🔢 **Kalan Sunucu Sayım:** ${toplamSunucu}  
🧑‍🤝‍🧑 **Kalan Kullanıcı Sayım:** ${toplamKullanici}  

😢 **Beni tekrar eklemek isterseniz:** [Buraya tıklayın!](https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot)
    `
    )
    .setThumbnail(
      guild.iconURL({ dynamic: true }) || client.user.displayAvatarURL()
    )
    .setFooter({
      text: "Görüşmek üzere! 🥺",
      iconURL: client.user.displayAvatarURL(),
    })
    .setTimestamp();

  try {
    const logKanal = await client.channels.fetch(botConfig.logChannelId);
    if (logKanal) {
      logKanal.send({ embeds: [EmbedCikis] });
    }
  } catch (hata) {
    console.error("❌ Kanal bulunamadı veya mesaj gönderilemedi:", hata);
  }
};
