// commands/eval.js
const { QuickDB } = require("quick.db");
const db = new QuickDB();
const util = require("util");
const emojis = require("../emoji.json");

const FORBIDDEN = [
  "process.env",
  "process.exit",
  "client.token",
  "token",
  "process.kill",
  "child_process",
  "require('child_process')",
  "require(\"child_process\")",
  "fs.",
];

exports.execute = async (client, message, args) => {
  if (!client.config || !client.config.admins || !client.config.admins.includes(message.author.id)) {
    return message.reply(
      `${emojis.bot.error} | **${message.member ? message.member.displayName : message.author.username}**, bu büyüyü kullanmana izin yok~`
    );
  }

  const code = args.join(" ");
  if (!code) {
    return message.reply(
      `${emojis.bot.error} | **${message.member ? message.member.displayName : message.author.username}**, çalıştırılacak bir şey yazmadın~ Lütfen kodunu gir :3`
    );
  }

  for (const f of FORBIDDEN) {
    if (code.includes(f)) {
      return message.reply(
        `${emojis.bot.error} | Hm... Bu kod bana tehlikeli görünüyor~ Güvenlik sebebiyle çalıştıramam >_<`
      );
    }
  }

  try {
    const asyncWrapper = `(async (client, message, args, db) => { ${code} })`;
    const fn = eval(asyncWrapper);
    let result = await fn(client, message, args, db);

    if (typeof result === "object") {
      result = util.inspect(result, { depth: 1 });
    }
    const out = String(result === undefined ? "undefined" : result);

    if (out.length > 1900) {
      const chunks = out.match(/[\s\S]{1,1900}/g);
      for (const c of chunks) {
        await message.channel.send(`${emojis.bot.succes} | \`\`\`js\n${c}\n\`\`\``);
      }
    } else {
      message.channel.send(`${emojis.bot.succes} | \`\`\`js\n${out}\n\`\`\``);
    }
  } catch (err) {
    const e = err.stack || err;
    message.channel.send(
      `${emojis.bot.error} | **${message.member ? message.member.displayName : message.author.username}**, kodda bir şeyler ters gitti~ qwq\n\`\`\`js\n${String(e).slice(0, 1900)}\n\`\`\``
    );
  }
};

exports.help = {
  name: "eval",
  aliases: [],
  usage: "eval <javascript>",
  description: "Bot üzerinde JS kodu çalıştırır (sadece admin).",
  category: "Bot",
  cooldown: 0,
  admin: true,
};
