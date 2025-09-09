const emojis = require("../emoji.json");

exports.execute = async (client, message, args) => {
  const userId = args[0];

  if (!userId)
    return message.reply(
      `${emojis.bot.error} | **${message.member.displayName}**, lütfen banı kaldırılacak kullanıcının ID'sini gir~ :c`
    );

  try {
    const user = await message.guild.members.unban(userId);

    if (!user)
      return message.reply(
        `${emojis.bot.error} | **${message.member.displayName}**, verilen ID ile banlanmış bir kullanıcı bulunamadı~`
      );

    return message.channel.send(
      `${emojis.bot.succes} | **${message.member.displayName}**, ID'si \`${userId}\` olan kullanıcının banı başarıyla kaldırıldı~`
    );
  } catch (error) {
    console.error(error);
    return message.reply(
      `${emojis.bot.error} | **${message.member.displayName}**, ban kaldırılırken bir hata oluştu~ Lütfen ID'yi kontrol et ve kullanıcının gerçekten banlı olduğundan emin ol~ :c`
    );
  }
};

exports.help = {
  name: "unban",
  aliases: ["banıaç"],
  usage: "unban <kullanıcı ID>",
  description: "Bir kullanıcının yasağını kaldırır.",
  category: "Moderasyon",
  cooldown: 5,
  permissions: ["BAN_MEMBERS"],
};
