const { MessageActionRow, MessageButton, MessageEmbed } = require('discord.js');

async function sendChallenge(
  message,
  challengerUser,
  targetUser,
  timeout = 300000
) {
  const channel = message.channel;
  const challengerTag = `<@${challengerUser.id}>`;
  const targetTag = `<@${targetUser.id}>`;

  const row = new MessageActionRow().addComponents(
    new MessageButton()
      .setCustomId('battle_accept')
      .setLabel('Kabul ✅')
      .setStyle('SUCCESS'),
    new MessageButton()
      .setCustomId('battle_decline')
      .setLabel('Reddet ❌')
      .setStyle('DANGER')
  );

  const embed = new MessageEmbed()
    .setTitle('Savaş Daveti')
    .setDescription(
      `${targetTag}, ${challengerTag} seni savaşa davet ediyor. 5 dakika içinde seçim yap.`
    )
    .setColor('BLUE');

  const prompt = await channel.send({ embeds: [embed], components: [row] });

  const filter = (interaction) => {
    return (
      interaction.user.id === targetUser.id &&
      ['battle_accept', 'battle_decline'].includes(interaction.customId)
    );
  };

  return new Promise((resolve) => {
    const collector = prompt.createMessageComponentCollector({
      filter,
      max: 1,
      time: timeout,
    });

    collector.on('collect', async (interaction) => {
      await interaction.deferUpdate().catch(() => {});
      if (interaction.customId === 'battle_accept') {
        // butonları devre dışı bırak
        const disabled = new MessageActionRow().addComponents(
          new MessageButton()
            .setCustomId('battle_accept')
            .setLabel('Kabul ✅')
            .setStyle('SUCCESS')
            .setDisabled(true),
          new MessageButton()
            .setCustomId('battle_decline')
            .setLabel('Reddet ❌')
            .setStyle('DANGER')
            .setDisabled(true)
        );
        await prompt.edit({ components: [disabled] }).catch(() => {});
        resolve({ accepted: true, msg: prompt });
      } else {
        const disabled = new MessageActionRow().addComponents(
          new MessageButton()
            .setCustomId('battle_accept')
            .setLabel('Kabul ✅')
            .setStyle('SUCCESS')
            .setDisabled(true),
          new MessageButton()
            .setCustomId('battle_decline')
            .setLabel('Reddet ❌')
            .setStyle('DANGER')
            .setDisabled(true)
        );
        await prompt.edit({ components: [disabled] }).catch(() => {});
        resolve({ accepted: false, msg: prompt });
      }
    });

    collector.on('end', (collected) => {
      if (collected.size === 0) {
        prompt
          .edit({
            content: `${targetTag} 5 dakika içinde cevap vermedi. Savaş iptal edildi.`,
            components: [],
          })
          .catch(() => {});
        resolve({ accepted: false, msg: prompt, timeout: true });
      }
    });
  });
}

module.exports = { sendChallenge };
