const { joinVoiceChannel } = require("@discordjs/voice");

module.exports = async (client, channel) => {
  if (!channel.guild) return;

  const db = client.db;
  const guildId = channel.guild.id;

  const stickyKey = `stickyMessage_${channel.id}`;
  const sticky = await db.get(stickyKey);

  const autoVCKey = `autoVC_${guildId}`;
  const autoVC = await db.get(autoVCKey);
  const isVCTracked = autoVC?.id === channel.id;

  if (!sticky && !isVCTracked) return;

  try {
    const newChannel = await channel.guild.channels.create(channel.name, {
      type: channel.type,
      parent: channel.parentId,
      permissionOverwrites: channel.permissionOverwrites.cache.map((ov) => ({
        id: ov.id,
        allow: ov.allow.toArray(),
        deny: ov.deny.toArray(),
        type: ov.type,
      })),
      reason: "Sticky veya VC sistemi nedeniyle yeniden oluşturuldu.",
    });

    if (sticky) {
      const sent = await newChannel.send(sticky.content);
      await db.set(`stickyMessage_${newChannel.id}`, {
        messageId: sent.id,
        content: sticky.content,
      });
      await db.delete(stickyKey);
    }

    if (isVCTracked && newChannel.isVoice()) {
      await db.set(autoVCKey, {
        id: newChannel.id,
        name: newChannel.name,
      });

      const connection = joinVoiceChannel({
        channelId: newChannel.id,
        guildId: guildId,
        adapterCreator: channel.guild.voiceAdapterCreator,
      });

      connection.on("stateChange", (oldState, newState) => {
        if (newState.status === "connected") {
        }
      });
    }
  } catch (err) {
    console.error("❌ Kanal yeniden oluşturulurken hata:", err);
  }
};
