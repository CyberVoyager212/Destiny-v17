const { MessageEmbed } = require("discord.js");
const emojis = require("../emoji.json");

module.exports = {
  help: {
    name: "whohasrole",
    aliases: ["roldekiler", "kimdevar"],
    usage: "whohasrole @Rol",
    description: "Belirtilen role sahip olan kullanıcıları listeler.",
    category: "Moderasyon",
    cooldown: 5,
    permissions: ["MANAGE_ROLES"],
  },

  async execute(client, message, args) {
    try {
      // Yetki kontrolü
      if (!message.member.permissions.has("MANAGE_ROLES")) {
        return message.reply(
          `${emojis.bot.error} | **${message.member.displayName}**, üzgünüm qwq~ bu komutu kullanmaya yetkin yok.`
        );
      }

      if (!args.length)
        return message.reply(
          `${emojis.bot.error} | **${message.member.displayName}**, lütfen bir rol etiketle veya ID gir~ \`whohasrole @Rol\``
        );

      const role =
        message.mentions.roles.first() || message.guild.roles.cache.get(args[0]);

      if (!role) {
        return message.reply(
          `${emojis.bot.error} | **${message.member.displayName}**, belirtilen rolü bulamadım~ doğru etiketlediğinden emin ol :c`
        );
      }

      // Rolü olan üyeleri al
      const membersWithRole = message.guild.members.cache
        .filter((member) => member.roles.cache.has(role.id))
        .map((m) => `${m.user.tag} (<@${m.id}>)`);

      if (!membersWithRole.length) {
        return message.reply(
          `${emojis.bot.error} | **${message.member.displayName}**, bu rolde kimse yok gibi görünüyor uwu~`
        );
      }

      // Eğer çok fazla kullanıcı varsa sadece ilk 50'sini göster ve sayıyı belirt
      const MAX_SHOW = 50;
      const listToShow = membersWithRole.slice(0, MAX_SHOW).join("\n");
      const moreCount = membersWithRole.length - MAX_SHOW;

      const embed = new MessageEmbed()
        .setTitle(`${emojis.bot.succes} | ${role.name} rolüne sahip kullanıcılar`)
        .setDescription(listToShow + (moreCount > 0 ? `\n\n... ve **${moreCount}** kişi daha` : ""))
        .setColor("#00FF00")
        .setFooter({ text: `Talep eden: ${message.member.displayName}` })
        .setTimestamp();

      return message.channel.send({ embeds: [embed] });
    } catch (err) {
      console.error("whohasrole hata:", err);
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, bir şeyler ters gitti qwq~ \n> Hata: \`${err?.message || "Bilinmeyen hata"}\``
      );
    }
  },
};
