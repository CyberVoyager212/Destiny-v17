const { MessageEmbed } = require("discord.js");
const emojis = require("../emoji.json");

exports.help = {
  name: "gelecek",
  description: "Senin 10 yıl sonraki hayatını tahmin eder.",
  usage: "gelecek",
  example: "gelecek",
  category: "Eğlence",
  cooldown: 5,
};

exports.execute = async (client, message, args) => {
  try {
    const tahminler = [
      "10 yıl sonra süper zengin bir CEO olacaksın! 🏦💸",
      "Uzay yolculuğu yapacaksın ve Mars'a gideceksin! 🚀",
      "Biraz fazla oyun oynadın, hala aynı odada takılıyorsun... 🎮😂",
      "Efsane bir sanatçı olacaksın ve dünyaca ünlü olacaksın! 🎨✨",
      "Kendi adını taşıyan bir teknoloji şirketi kurmuşsun! 📱",
      "Maalesef ki vergiler yüzünden hala çalışıyorsun... 😩",
      "Dünyayı dolaşan bir gezgin olacaksın! ✈️🌍",
      "Büyük bir aileye sahip olacaksın ve mutlu bir hayat süreceksin! 👨‍👩‍👧‍👦❤️",
      "Sürekli kendini geliştiren bir bilim insanı olacaksın! 🔬🧠",
      "Bir yazar olup çok satan kitaplar yazacaksın! 📚✍️",
      "Profesyonel bir sporcu olarak olimpiyatlarda madalya kazanacaksın! 🥇🏅",
      "Mistik güçlere sahip olup gizemli maceralara atılacaksın! 🔮✨",
      "Kendi restoran zincirini kuracaksın ve lezzetleriyle meşhur olacaksın! 🍽️👨‍🍳",
      "Çevreci bir aktivist olup dünyayı kurtaracaksın! 🌱🌎",
      "Teknoloji dünyasında devrim yaratacak bir mucit olacaksın! 🤖⚙️",
    ];

    const tahmin = tahminler[Math.floor(Math.random() * tahminler.length)];

    const embed = new MessageEmbed()
      .setTitle(`${emojis.bot.succes} Gelecek Tahmini `)
      .setDescription(
        `**${message.member.displayName}**, 10 yıl sonra:\n**${tahmin}**`
      )
      .setColor("#ffcc00")
      .setFooter({
        text: `${client.user.username} Gelecek Botu`,
        iconURL: client.user.displayAvatarURL(),
      })
      .setTimestamp();

    return message.channel.send({ embeds: [embed] });
  } catch (err) {
    console.error(err);
    return message.channel.send(
      `${emojis.bot.error} | **${message.member.displayName}**, geleceğe bakmak istedim ama kristal küre çatladı... biraz bekle sonra tekrar sor~ :c`
    );
  }
};
