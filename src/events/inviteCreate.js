module.exports = async (client, invite) => {
  try {
    const invites = await invite.guild.invites.fetch();
    const inviteMap = new Map();
    invites.forEach((i) => {
      inviteMap.set(i.code, {
        uses: i.uses,
        inviter: i.inviter?.id,
      });
    });

    client.invites.set(invite.guild.id, inviteMap);
  } catch (err) {
    console.error("[InviteCreate] Hata:", err);
  }
};
