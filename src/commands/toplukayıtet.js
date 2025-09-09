const femaleNames = [
  "Ayşe",
  "Fatma",
  "Elif",
  "Merve",
  "Zeynep",
  "Hatice",
  "Emine",
  "Rabia",
  "Aylin",
  "Derya",
  "Gül",
  "Bahar",
  "Melike",
  "Gamze",
  "Pelin",
  "Sibel",
  "Selin",
  "Ebru",
  "Esra",
  "Burcu",
  "Hande",
  "Deniz",
  "Tuğba",
  "Büşra",
  "Şeyma",
  "Özge",
  "Nazlı",
  "Aslı",
  "Ceren",
  "Ece",
  "Dilara",
  "Aysel",
  "Feride",
  "Filiz",
  "Aysu",
  "Aydan",
  "Seda",
  "Sevda",
  "Sevim",
  "Serap",
  "Naz",
  "Beyza",
  "Gizem",
  "Leyla",
  "İpek",
  "Aylin",
  "Yeşim",
  "Funda",
  "Nil",
  "Nazan",
  "Neşe",
  "Dilek",
  "Çağla",
  "Yasemin",
  "Gülsüm",
  "Sevil",
  "Suna",
  "Elvin",
  "Canan",
  "Seher",
  "Gülşen",
  "Hale",
  "Jale",
  "Zehra",
  "Serra",
  "Özlem",
  "Gonca",
  "Gülcan",
  "Nur",
  "Betül",
  "Işıl",
  "Zeliha",
  "Açelya",
  "Esen",
  "Gaye",
  "Gülay",
  "Hilal",
  "Melis",
  "Eylül",
  "Başak",
  "Sevgi",
  "Şirin",
  "Suna",
  "Yonca",
  "Şeyda",
  "Elvan",
  "Güliz",
  "Irmak",
  "Berrin",
  "Esin",
  "Nihan",
  "Belgin",
  "Bengü",
  "Ceyda",
  "Gülseren",
  "Hicran",
  "İnci",
  "Nurcan",
  "Pelin",
  "Reyhan",
  "Sevinç",
  "Sibel",
  "Simge",
  "Şermin",
  "Tülay",
  "Ülkü",
  "Yelda",
  "Zehra",
  "Ahu",
  "Aysun",
  "Berna",
  "Çağrı",
  "Demet",
  "Dilan",
  "Eda",
  "Esma",
  "Feyza",
  "Gülnur",
  "Hümeyra",
  "Ilgın",
  "Jülide",
  "Leman",
  "Melike",
  "Nalan",
  "Nazife",
  "Necla",
  "Neval",
  "Perran",
  "Saadet",
  "Sahra",
  "Şükriye",
  "Tansu",
  "Ümmü",
  "Yasemin",
  "Zeyno",
  "Aydan",
  "Bade",
  "Beril",
  "Cansel",
  "Çiğdem",
  "Derya",
  "Eylem",
  "Feray",
  "Gülbin",
  "Hanzade",
  "İlayda",
  "Jale",
  "Kübra",
  "Lale",
  "Mehlika",
];

const maleNames = [
  "Ahmet",
  "Mehmet",
  "Ali",
  "Mustafa",
  "Murat",
  "Hasan",
  "Hüseyin",
  "İbrahim",
  "Yusuf",
  "Ömer",
  "Emre",
  "Can",
  "Kemal",
  "Mahmut",
  "Rıza",
  "Serkan",
  "Cem",
  "Furkan",
  "Uğur",
  "Onur",
  "Burak",
  "Kaan",
  "Hakan",
  "Volkan",
  "Tamer",
  "Barış",
  "Eren",
  "Arda",
  "Okan",
  "Ege",
  "Yunus",
  "Gökhan",
  "Sinan",
  "Deniz",
  "Metin",
  "Salih",
  "Rıdvan",
  "Sefa",
  "Mert",
  "Fırat",
  "Kadir",
  "Süleyman",
  "Bekir",
  "Ferhat",
  "Tuna",
  "Tuncay",
  "Cihan",
  "Levent",
  "Erdem",
  "Cengiz",
  "Tayfun",
  "Tolga",
  "Görkem",
  "Anıl",
  "Oğuz",
  "Ertuğrul",
  "Erhan",
  "Efe",
  "Yılmaz",
  "Veysel",
  "Veli",
  "Vedat",
  "Mehmet Ali",
  "Ahmet Can",
  "Mustafa Kemal",
  "Kemalettin",
  "Ali Kemal",
  "Fatih",
  "Zafer",
  "Engin",
  "Aydın",
  "Adnan",
  "Şahin",
  "Özcan",
  "Alper",
  "Samet",
  "Halil",
  "Harun",
  "Kürşat",
  "Cemal",
  "Zafer",
  "Ramazan",
  "Recep",
  "Mevlüt",
  "Fuat",
  "Bora",
  "Ata",
  "Ufuk",
  "Tuncer",
  "Rüstem",
  "Melih",
  "Sami",
  "Serdar",
  "Ferdi",
  "Cevdet",
  "Ender",
  "Cemil",
  "Orhan",
  "Erkan",
  "Kamil",
  "Tahir",
  "Kazım",
  "Cemalettin",
  "Sabri",
  "Sadi",
  "Emin",
  "Nihat",
  "Nevzat",
  "Nurettin",
  "Şükrü",
  "Bülent",
  "Burhan",
  "Turgut",
  "Suat",
  "Sabahattin",
  "Fikret",
  "Alpay",
  "Gökay",
  "Tayyar",
  "Behçet",
  "Hikmet",
  "Atilla",
  "Selçuk",
  "İlker",
  "Koray",
  "Sarp",
  "Korhan",
  "Nejat",
  "Ozan",
  "Utku",
  "Hüsnü",
  "Orçun",
  "Tufan",
  "Bünyamin",
  "Naci",
  "Hasan Hüseyin",
  "Osman",
  "Bilal",
  "Necati",
  "Nazım",
];
const emojis = require("../emoji.json");

exports.execute = async (client, message, args) => {
  try {
    if (!message.member.permissions.has("MANAGE_ROLES")) {
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, üzgünüm qwq~ bu komutu kullanmaya yetkin yok...`
      );
    }

    const botPerms = ["MANAGE_ROLES", "MANAGE_NICKNAMES"];
    const missing = botPerms.filter(
      (perm) => !message.guild.me.permissions.has(perm)
    );
    if (missing.length > 0) {
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, bana şu izinleri verir misin? ${missing
          .map((p) => `\`${p}\``)
          .join(", ")} ~ yoksa sihir yapamıyorum :c`
      );
    }

    const sub = args[0]?.toLowerCase();
    const roles = message.mentions.roles;

    if (!sub || !["cinsiyet", "normal"].includes(sub)) {
      return message.reply(
        `${emojis.bot.error} | Geçersiz alt komut! UwU\nKullanım:\n\`tke cinsiyet @female @male @üye @unregistered\`\n\`tke normal @üye @unregistered\``
      );
    }

    const uyeRol = roles.at(sub === "cinsiyet" ? 2 : 0);
    const unregisteredRol = roles.at(sub === "cinsiyet" ? 3 : 1);

    if (!uyeRol || !unregisteredRol) {
      return message.reply(
        `${emojis.bot.error} | Lütfen \`@üye\` ve \`@unregistered\` rollerini etiketle~`
      );
    }

    const unregisteredMembers = message.guild.members.cache.filter((m) =>
      m.roles.cache.has(unregisteredRol.id)
    );
    if (unregisteredMembers.size === 0) {
      return message.reply(
        `${emojis.bot.error} | Kayıtsız kullanıcı bulunamadı qwq...`
      );
    }

    let count = 0;
    for (const member of unregisteredMembers.values()) {
      try {
        await member.roles.remove(unregisteredRol);
        let age = Math.floor(Math.random() * 7) + 15;
        let name = "Üye";

        if (sub === "cinsiyet") {
          const femaleRol = roles.at(0);
          const maleRol = roles.at(1);
          if (Math.random() < 0.5) {
            name =
              femaleNames[Math.floor(Math.random() * femaleNames.length)];
            await member.roles.add(femaleRol);
          } else {
            name = maleNames[Math.floor(Math.random() * maleNames.length)];
            await member.roles.add(maleRol);
          }
        } else {
          name =
            Math.random() < 0.5
              ? femaleNames[Math.floor(Math.random() * femaleNames.length)]
              : maleNames[Math.floor(Math.random() * maleNames.length)];
        }

        const newName = `${name} | ${age}`;
        await member.roles.add(uyeRol);
        await member.setNickname(newName);
        count++;
      } catch (err) {
        console.error(`⚠️ ${member.user.tag} için hata:`, err);
        continue;
      }
    }

    return message.channel.send(
      `${emojis.bot.succes} | Toplam **${count}** üye başarıyla kayıt edildi~ (${
        sub === "cinsiyet" ? "Cinsiyetli sistem" : "Normal sistem"
      })`
    );
  } catch (error) {
    console.error("Toplu kayıt hatası:", error);
    return message.reply(
      `${emojis.bot.error} | **${message.member.displayName}**, işler biraz karıştı qwq~ tekrar denemeyi düşünür müsün?`
    );
  }
};

exports.help = {
  name: "toplukayıtet",
  aliases: ["tke", "ra", "registerall"],
  usage:
    "tke cinsiyet @female @male @üye @unregistered\n" +
    "tke normal @üye @unregistered",
  description:
    "Kayıtsız üyeleri topluca kayıt eder. Cinsiyetli ya da tek rol sistemiyle çalışır.",
  category: "Moderasyon",
  cooldown: 5,
  permissions: ["MANAGE_ROLES"],
};
