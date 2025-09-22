module.exports = async (client, invite) => {
  try {
    const guildId = invite.guild.id;
    const cached = client.invites.get(guildId);
    if (!cached) return;
    cached.delete(invite.code);
    client.invites.set(guildId, cached);
  } catch (err) {
    console.error("[InviteDelete] Hata:", err);
  }
};
