const { MessageEmbed } = require("discord.js");

module.exports = async (client, member) => {
  const guildId = member.guild.id;

  const ksUnregRoleId = await client.db.get(`kayitsizRol_${guildId}`);
  const ksAutoName = await client.db.get(`autoName_${guildId}`);

  const ggsConfig = await client.db.get(`welcomegoodbye_${guildId}`);
  let unregRoleId = ksUnregRoleId;
  if (
    !unregRoleId &&
    ggsConfig?.enabled &&
    ggsConfig.otorol?.kullanıcı?.length
  ) {
    unregRoleId = ggsConfig.otorol.kullanıcı[0];
  }

  let nickname = null;
  if (ggsConfig?.enabled && ggsConfig.otoisim?.kullanıcı) {
    nickname = ggsConfig.otoisim.kullanıcı;
  } else if (ksAutoName) {
    nickname = ksAutoName;
  }

  let inviterId = null;
  if (ggsConfig?.enabled && ggsConfig.inviteTracking) {
    try {
      const newInv = await member.guild.invites.fetch();
      const oldMap = client.invites.get(guildId) || new Map();
      const used = newInv.find((inv) => {
        const prev = oldMap.get(inv.code);
        return prev && inv.uses > prev.uses;
      });
      if (used) inviterId = used.inviter;
      const updated = new Map();
      newInv.forEach((i) =>
        updated.set(i.code, { uses: i.uses, inviter: i.inviter?.id })
      );
      client.invites.set(guildId, updated);
    } catch (err) {
      console.error("[GGA] Invite tracking error:", err);
    }
  }

  await new Promise((r) => setTimeout(r, 500));

  if (unregRoleId) {
    const role = member.guild.roles.cache.get(unregRoleId);
    if (role) {
      member.roles
        .add(role)
        .catch((err) =>
          console.error(`[AutoUnreg] ${member.user.tag} rol eklenemedi:`, err)
        );
    }
  }

  await new Promise((r) => setTimeout(r, 500));

  if (nickname) {
    member
      .setNickname(nickname)
      .catch((err) =>
        console.error(`[AutoName] ${member.user.tag} isim ayarlanamadı:`, err)
      );
  }

  if (ggsConfig?.enabled) {
    let text = ggsConfig.entryMessage
      .replace(/\$etiket/g, member.toString())
      .replace(/\$sayı/g, member.guild.memberCount)
      .replace(/\$katılım/g, member.joinedAt.toLocaleDateString())
      .replace(/\$davet/g, inviterId ? `${inviterId}` : "Bilinmiyor");

    let embed;
    const m = text.match(/\$embed;(.+)/);
    if (m) {
      embed = new MessageEmbed()
        .setTitle(m[1].trim())
        .setDescription(text.replace(/\$embed;(.+)/, "").trim())
        .setColor("GREEN");
      text = null;
    }

    const ch = member.guild.channels.cache.get(ggsConfig.incomingChannel);
    if (ch) {
      try {
        if (embed) await ch.send({ embeds: [embed] });
        else await ch.send(text);
      } catch (err) {
        console.error("[GGA] Mesaj gönderilemedi:", err);
      }
    }
  }
};
