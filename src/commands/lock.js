const emojis = require("../emoji.json");

module.exports = {
  name: "lock",
  description:
    "Yöneticiler hariç tüm rollerin belirtilen kanallara yazmasını kilitler veya açar.",
  usage: "lock <lock|unlock> [#kanal ...]",
  aliases: [],
  category: "Moderasyon",
  cooldown: 10,

  async execute(client, message, args) {
    if (!message.member.permissions.has("MANAGE_CHANNELS")) {
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, bu komutu kullanmak için gerekli güce sahip değilsin... bana kızma lütfen qwq`
      );
    }

    if (!args[0] || !["lock", "unlock"].includes(args[0].toLowerCase())) {
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, doğru bir seçenek yazmalısın... "lock" veya "unlock" olmalı >.<`
      );
    }

    const action = args[0].toLowerCase();

    const channels =
      message.mentions.channels.size > 0
        ? message.mentions.channels
        : new Map([[message.channel.id, message.channel]]);

    const roles = message.guild.roles.cache.filter(
      (role) => !role.permissions.has("ADMINISTRATOR")
    );

    try {
      for (const [, channel] of channels) {
        for (const [roleId, role] of roles) {
          await channel.permissionOverwrites.edit(role, {
            SEND_MESSAGES: action === "lock" ? false : null,
          });
        }

        if (action === "lock") {
          await channel.send(
            `${emojis.bot.succes} | **${message.member.displayName}**, bu kanal kilitlendi! 🔒 Artık sadece güçlüler (yöneticiler) yazabiliyor~`
          );
        } else {
          await channel.send(
            `${emojis.bot.succes} | **${message.member.displayName}**, kilit kaldırıldı! 🔓 Artık herkes konuşabilir, dikkat et gürültü artabilir :3`
          );
        }
      }
    } catch (error) {
      console.error(error);
      return message.reply(
        `${emojis.bot.error} | Auu~ bir şeyler ters gitti **${message.member.displayName}**... kanal kilitlenirken ya da açılırken elim ayağıma dolaştı :c`
      );
    }
  },

  help: {
    name: "lock",
    description:
      "Yöneticiler hariç tüm rollerin belirtilen kanallara mesaj göndermesini kilitler veya açar.",
    usage: "lock <lock|unlock> [#kanal ...]",
    aliases: [],
    category: "Moderasyon",
    cooldown: 10,
    permissions: ["MANAGE_CHANNELS"],
  },
};
