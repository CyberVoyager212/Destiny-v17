const math = require("mathjs");
const { MessageActionRow, MessageButton, MessageEmbed } = require("discord.js");
const emojis = require("../emoji.json");

exports.execute = async (client, message, args) => {
  const row1 = new MessageActionRow().addComponents(
    new MessageButton().setCustomId("1").setLabel("1").setStyle("SECONDARY"),
    new MessageButton().setCustomId("2").setLabel("2").setStyle("SECONDARY"),
    new MessageButton().setCustomId("3").setLabel("3").setStyle("SECONDARY"),
    new MessageButton().setCustomId("plus").setLabel("+").setStyle("PRIMARY"),
    new MessageButton().setCustomId("openParen").setLabel("(").setStyle("PRIMARY")
  );

  const row2 = new MessageActionRow().addComponents(
    new MessageButton().setCustomId("4").setLabel("4").setStyle("SECONDARY"),
    new MessageButton().setCustomId("5").setLabel("5").setStyle("SECONDARY"),
    new MessageButton().setCustomId("6").setLabel("6").setStyle("SECONDARY"),
    new MessageButton().setCustomId("minus").setLabel("-").setStyle("PRIMARY"),
    new MessageButton().setCustomId("closeParen").setLabel(")").setStyle("PRIMARY")
  );

  const row3 = new MessageActionRow().addComponents(
    new MessageButton().setCustomId("7").setLabel("7").setStyle("SECONDARY"),
    new MessageButton().setCustomId("8").setLabel("8").setStyle("SECONDARY"),
    new MessageButton().setCustomId("9").setLabel("9").setStyle("SECONDARY"),
    new MessageButton().setCustomId("multiply").setLabel("x").setStyle("PRIMARY"),
    new MessageButton().setCustomId("power").setLabel("^").setStyle("PRIMARY")
  );

  const row4 = new MessageActionRow().addComponents(
    new MessageButton().setCustomId("clear").setLabel("AC").setStyle("DANGER"),
    new MessageButton().setCustomId("0").setLabel("0").setStyle("SECONDARY"),
    new MessageButton().setCustomId("delete").setLabel("⌫").setStyle("DANGER"),
    new MessageButton().setCustomId("divide").setLabel("/").setStyle("PRIMARY"),
    new MessageButton().setCustomId("equals").setLabel("=").setStyle("SUCCESS")
  );

  let currentExpression = "";

  const baseEmbed = (description, color = "BLUE") =>
    new MessageEmbed().setTitle("🧮・Hesap Makinesi").setDescription(description).setColor(color);

  const startMessage = await message.reply({
    content: `${emojis.bot.succes} | Hesap makinesi hazır! Butonlara tıklayarak işlemleri yapabilirsin~`,
    embeds: [baseEmbed(`Hesaplama: ${currentExpression}`)],
    components: [row1, row2, row3, row4],
  });

  const filter = (interaction) => interaction.user.id === message.author.id;
  const collector = startMessage.createMessageComponentCollector({
    filter,
    time: 60000,
  });

  const isOperator = (ch) => ["+", "-", "*", "/", "^"].includes(ch);

  collector.on("collect", async (interaction) => {
    await interaction.deferUpdate();

    if (typeof collector.resetTimer === "function") {
      try {
        collector.resetTimer();
      } catch (e) {}
    }

    const buttonId = interaction.customId;
    let warning = null;
    let showExpression = true;

    if (buttonId === "clear") {
      currentExpression = "";
    } else if (buttonId === "delete") {
      currentExpression = currentExpression.slice(0, -1);
    } else if (buttonId === "equals") {
      if (!currentExpression || currentExpression.trim() === "") {
        warning = `${emojis.bot.error} | **${message.member.displayName}**, hii-ii~ hiç şey yok ki hesaplayayım~ önce bir şey yazsan? :c`;
        showExpression = false;
      } else {
        try {
          const result = math.evaluate(currentExpression);
          if (result === Infinity || result === -Infinity || Number.isNaN(result)) {
            warning = `${emojis.bot.error} | **${message.member.displayName}**, sıfıra bölünme ya da geçersiz sonuç çıktı~ bunu yapamam~`;
            showExpression = false;
          } else {
            currentExpression = result.toString();
            showExpression = true;
          }
        } catch (err) {
          const msg = String(err).toLowerCase();
          if (msg.includes("parenthesis") || msg.includes("parentheses") || msg.includes("paren")) {
            warning = `${emojis.bot.error} | **${message.member.displayName}**, parantezler karışmış gibi duruyor~ lütfen kontrol et~`;
          } else {
            warning = `${emojis.bot.error} | **${message.member.displayName}**, ahh~ bir hata oluştu! İfadeni anlayamıyorum :<`;
          }
          showExpression = false;
        }
      }
    } else if (buttonId === "openParen") {
      if (currentExpression && /[0-9)]$/.test(currentExpression)) {
        warning = `${emojis.bot.error} | **${message.member.displayName}**, paranteze hemen sayı veya kapatma ekleyemezsin~ önce bir operatör ekle veya baştan aç!`;
        showExpression = false;
      } else {
        currentExpression += "(";
      }
    } else if (buttonId === "closeParen") {
      const openCount = (currentExpression.match(/\(/g) || []).length;
      const closeCount = (currentExpression.match(/\)/g) || []).length;
      if (openCount <= closeCount) {
        warning = `${emojis.bot.error} | **${message.member.displayName}**, kapatma parantezi için açılmış parantez yok gibi~ fazla kapatma yapma lütfen~`;
        showExpression = false;
      } else if (/[+\-*/^]$/.test(currentExpression)) {
        warning = `${emojis.bot.error} | **${message.member.displayName}**, operatörden sonra doğrudan ')' koyamazsın~ önce bir sayı koy~`;
        showExpression = false;
      } else {
        currentExpression += ")";
      }
    } else {
      const toAdd =
        buttonId === "plus"
          ? "+"
          : buttonId === "minus"
          ? "-"
          : buttonId === "multiply"
          ? "*"
          : buttonId === "divide"
          ? "/"
          : buttonId === "power"
          ? "^"
          : buttonId;

      if (isOperator(toAdd)) {
        if (!currentExpression || currentExpression.trim() === "") {
          if (toAdd !== "-") {
            warning = `${emojis.bot.error} | **${message.member.displayName}**, operatörle başlayamam~ önce bir sayı yaz lütfen~`;
            showExpression = false;
          } else {
            currentExpression += toAdd;
          }
        } else if (isOperator(currentExpression.slice(-1))) {
          warning = `${emojis.bot.error} | **${message.member.displayName}**, iki operatörü peş peşe koyamam~ bu seferlik durduruyorum~`;
          showExpression = false;
        } else {
          currentExpression += toAdd;
        }
      } else {
        currentExpression += toAdd;
      }
    }

    const desc = warning
      ? warning
      : `Hesaplama: ${currentExpression}`;

    const color = warning ? "RED" : "BLUE";

    await interaction.editReply({
      embeds: [baseEmbed(desc, color)],
      components: [row1, row2, row3, row4],
    });
  });

collector.on("end", async () => {
  try {
    if (startMessage && !startMessage.deleted) {
      await startMessage.edit({
        content: `${emojis.bot.error} |  **${message.member.displayName}**, lütfen biraz yavaş ol~ bana göre çok hızlısın :c`,
        embeds: [
          new MessageEmbed()
            .setTitle("🧮・Hesap Makinesi")
            .setDescription("⏰ Süre doldu, işlem iptal edildi~")
            .setColor("RED"),
        ],
        components: [],
      });
    }
  } catch (err) {
    // Mesaj silinmiş veya bulunamamışsa hata yutulacak
    if (err.code !== 10008) console.error("Hesap makinesi end hatası:", err);
  }
});
};

exports.help = {
  name: "calculator",
  aliases: ["calc", "hesapla"],
  usage: "calculator",
  description: "Matematiksel işlemler yapmanıza olanak tanır.",
  category: "Araçlar",
  cooldown: 15,
};
