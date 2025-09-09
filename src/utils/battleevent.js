const { MessageEmbed } = require("discord.js");

function rarityLetterFromCounts(counts) {
  const order = ["legendary", "epic", "rare", "common"];
  let max = -1,
    pick = "common";
  for (const k of order) {
    if ((counts[k] || 0) > max) {
      max = counts[k] || 0;
      pick = k;
    }
  }
  return { legendary: "L", epic: "E", rare: "R", common: "C" }[pick] || "C";
}

function petLine(pet, index) {
  const lvl = pet.level || 1;
  const name = pet.name || "Unnamed";
  const letter = pet.itemRarityLetter || "C";
  const attackEmoji = pet.items && pet.items.attack ? "⚔️" : "—";
  const armorEmoji = pet.items && pet.items.armor ? "🛡️" : "—";
  const magicEmoji = pet.items && pet.items.magic ? "✨" : "—";
  return `L. ${lvl} : (${name}) - ${letter}-${attackEmoji}-${armorEmoji}-${magicEmoji}`;
}

function createBattleEmbed(
  playerDisplayName,
  playerTeam,
  enemyTeam,
  isVersusUser = false,
  streak = 0
) {
  const embed = new MessageEmbed()
    .setTitle(`${playerDisplayName} savaşa giriyor!`)
    .setColor("#2f3136")
    .setTimestamp();

  const playerLines = playerTeam.map((p, i) => petLine(p, i + 1)).join("\n");
  const enemyLines = enemyTeam.map((p, i) => petLine(p, i + 1)).join("\n");

  embed.addField("Your team", playerLines || "Hiç hayvan yok");
  embed.addField("Enemy team", enemyLines || "Hiç hayvan yok");

  const streakText = `${playerDisplayName} bu savaşı da kazanarak üst üste ${streak} kez savaşı kazandın. Hayvanlarına ${
    streak * (streak * 50)
  } XP eklendi.`;
  embed.addField("Result (placeholder)", streakText);

  if (isVersusUser) {
    embed.setFooter("Rakip gerçek kullanıcı — kutu kazanma ihtimali yok.");
  } else {
    embed.setFooter(
      "Rakip rastgele oluşturuldu — kutu kazanma ihtimali olabilir."
    );
  }

  return embed;
}

module.exports = {
  createBattleEmbed,
  rarityLetterFromCounts,
};
