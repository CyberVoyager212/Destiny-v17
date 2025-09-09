const emojis = require("../emoji.json");

module.exports = {
  name: "hack",
  async execute(client, message, args) {
    if (!args.length)
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, lütfen bir kullanıcı adı veya ID girin~ >///<`
      );

    const target = args.join(" ");

    function randomBinary(length) {
      let result = "";
      for (let i = 0; i < length; i++) {
        result += Math.random() < 0.5 ? "0" : "1";
      }
      return result;
    }

    function randomIP() {
      return `${Math.floor(Math.random() * 255)}.${Math.floor(
        Math.random() * 255
      )}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    }

    function randomMAC() {
      return `${Math.floor(Math.random() * 255)
        .toString(16)
        .padStart(2, "0")}:${Math.floor(Math.random() * 255)
        .toString(16)
        .padStart(2, "0")}:${Math.floor(Math.random() * 255)
        .toString(16)
        .padStart(2, "0")}:${Math.floor(Math.random() * 255)
        .toString(16)
        .padStart(2, "0")}:${Math.floor(Math.random() * 255)
        .toString(16)
        .padStart(2, "0")}:${Math.floor(Math.random() * 255)
        .toString(16)
        .padStart(2, "0")}`;
    }

    function randomPassword() {
      return Math.random().toString(36).substring(2, 10);
    }

    function randomPort() {
      return Math.floor(Math.random() * 65535);
    }

    function delay(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }

    function generateProgressBar(progress) {
      const filled = Math.floor(progress / 10);
      const empty = 10 - filled;
      return `[%${progress} ${"█".repeat(filled)}${"░".repeat(empty)}]`;
    }

    const steps = [
      `💻 **Hedef: \`${target}\` hack işlemi başlatılıyor...**`,
      `🔍 **IP adresi bulunuyor:** \`${randomIP()}\``,
      `🌐 **DNS kayıtları inceleniyor...**`,
      `📡 **Traceroute başlatılıyor...**`,
      `🚪 **Açık portlar taranıyor:** [${randomPort()}], [${randomPort()}], [${randomPort()}]`,
      `🛡️ **Firewall güvenlik açıkları taranıyor...**`,
      `🔑 **SSH bağlantısı test ediliyor...**`,
      `🖥️ **Sistem bilgileri alınıyor...**`,
      `💽 **Veritabanı sunucusu belirleniyor...**`,
      `🔍 **SQL injection denemeleri yapılıyor...**`,
      `👾 **Zararlı yazılım yükleniyor...**`,
      `🔐 **Şifreleme algoritmaları analiz ediliyor...**`,
      `🕵️‍♂️ **Log dosyaları temizleniyor...**`,
      `📡 **Ağ trafiği izleniyor...**`,
      `🔍 **Kullanıcı hesap bilgileri indiriliyor...**`,
      `🔑 **Hash çözücü çalıştırılıyor...**`,
      `💾 **Yedekleme dosyaları inceleniyor...**`,
      `🧩 **Backdoor oluşturuluyor...**`,
      `🛠️ **Root erişimi sağlanıyor...**`,
      `🔄 **Oturum açma tokenleri kırılıyor...**`,
      `⚙️ **Sistem protokolleri hack ediliyor...**`,
      `📡 **Uzak sunucuya bağlanılıyor...**`,
      `🔓 **Şifreleme anahtarı ele geçirildi!**`,
      `🗂️ **Dosyalar indiriliyor...**`,
      `✅ **Hack işlemi tamamlandı!**\nBilgiler:\n- Kullanıcı adı: \`${target}\`\n- IP: \`${randomIP()}\`\n- MAC: \`${randomMAC()}\`\n- Son şifre: \`${randomPassword()}\`\n- Bağlantı noktası: \`${randomPort()}\``,
    ];

    try {
      let hackMessage = await message.channel.send(
        `${steps[0]}\n${generateProgressBar(0)}`
      );

      for (let i = 1; i < steps.length; i++) {
        const progressPercentage =
          Math.floor(((i / (steps.length - 1)) * 100) / 10) * 10;
        await delay(Math.random() * 2000 + 500);
        await hackMessage.edit(
          `${steps[i]}\n${generateProgressBar(progressPercentage)}`
        );
      }

      await message.channel.send(
        `${emojis.bot.succes} | **${message.member.displayName}**, hack simülasyonu başarıyla tamamlandı~ 👾✨`
      );
    } catch (err) {
      console.error("Hack simülasyon hatası:", err);
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, ayy~ hack simülasyonu sırasında bir sorun oluştu :c`
      );
    }
  },

  help: {
    name: "hack",
    aliases: [],
    usage: "hack [kullanıcı adı | ID]",
    description:
      "Belirtilen kullanıcı için sahte hack animasyonu yapar. Anime tarzı emoji ve ilerleme çubuğu içerir.",
    category: "Eğlence",
    cooldown: 15,
  },
};
