const {
  Interaction,
  Message,
  TextChannel,
  DMChannel,
  NewsChannel,
  ThreadChannel,
  MessageEmbed,
  WebhookClient,
} = require("discord.js");
const translate = require("translate-google");
const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "autotranslateforusers.json");

function loadJSON() {
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch (err) {
    console.error("JSON yüklenemedi:", err);
    return {};
  }
}
function saveJSON(data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}
function getUserLang(userId) {
  const data = loadJSON();
  return data[userId] || null;
}
function setUserLang(userId, lang) {
  const data = loadJSON();
  data[userId] = lang;
  saveJSON(data);
}
function deleteUserLang(userId) {
  const data = loadJSON();
  delete data[userId];
  saveJSON(data);
}

async function translateText(text, userId) {
  if (!text || typeof text !== "string") return text;

  const lang = getUserLang(userId);
  if (!lang) return text; 

  try {
    const res = await translate(text, { to: lang });
    return typeof res === "string" ? res : res.text ?? text;
  } catch (err) {
    console.error("Çeviri hatası (text):", err);
    return text;
  }
}

async function translateEmbedObject(embedOriginal, userId) {
  const isInstance = embedOriginal instanceof MessageEmbed;
  const plain =
    typeof embedOriginal.toJSON === "function"
      ? embedOriginal.toJSON()
      : { ...embedOriginal };

  if (plain.title) plain.title = await translateText(plain.title, userId);
  if (plain.description)
    plain.description = await translateText(plain.description, userId);
  if (plain.footer && plain.footer.text)
    plain.footer.text = await translateText(plain.footer.text, userId);
  if (plain.author && plain.author.name)
    plain.author.name = await translateText(plain.author.name, userId);
  if (Array.isArray(plain.fields)) {
    for (const f of plain.fields) {
      if (f.name) f.name = await translateText(f.name, userId);
      if (f.value) f.value = await translateText(f.value, userId);
    }
  }

  if (isInstance) return new MessageEmbed(plain);
  return plain;
}

async function translateComponents(components, userId) {
  if (!components || !Array.isArray(components)) return components;

  const newRows = [];
  for (const row of components) {
    const newRow = JSON.parse(JSON.stringify(row));
    if (Array.isArray(newRow.components)) {
      for (const comp of newRow.components) {
        if (comp.label) comp.label = await translateText(comp.label, userId);
        if (comp.placeholder)
          comp.placeholder = await translateText(comp.placeholder, userId);
        if (Array.isArray(comp.options)) {
          for (const opt of comp.options) {
            if (opt.label) opt.label = await translateText(opt.label, userId);
            if (opt.description)
              opt.description = await translateText(opt.description, userId);
          }
        }
      }
    }
    newRows.push(newRow);
  }
  return newRows;
}


async function getTargetUserId({ options, thisMessage, channel }) {
  try {
    if (options && options.userId) return options.userId;

    const maybeRefId =
      options?.reply?.messageReference?.messageId ||
      options?.reply?.messageReference ||
      options?.reply?.messageId ||
      options?.messageReference?.messageId ||
      options?.messageReference;

    if (
      maybeRefId &&
      channel &&
      typeof channel.messages?.fetch === "function"
    ) {
      try {
        const ref = await channel.messages.fetch(maybeRefId).catch(() => null);
        if (ref && ref.author) return ref.author.id;
      } catch (err) {
      }
    }

    if (thisMessage && thisMessage.reference && thisMessage.channel) {
      const refId = thisMessage.reference.messageId;
      if (refId) {
        try {
          const ref = await thisMessage.channel.messages
            .fetch(refId)
            .catch(() => null);
          if (ref && ref.author) return ref.author.id;
        } catch (err) {
        }
      }
    }

    if (
      channel &&
      channel.lastMessage &&
      channel.lastMessage.author &&
      !channel.lastMessage.author.bot
    ) {
      return channel.lastMessage.author.id;
    }

    return null;
  } catch (err) {
    console.error("getTargetUserId hata:", err);
    return null;
  }
}

async function handleOptions(options, userId) {
  if (!userId || !getUserLang(userId)) return options; 

  if (typeof options === "string") return await translateText(options, userId);

  const newOptions = Object.assign({}, options);

  if (newOptions.content)
    newOptions.content = await translateText(newOptions.content, userId);

  if (newOptions.embeds && Array.isArray(newOptions.embeds)) {
    const translatedEmbeds = [];
    for (const emb of newOptions.embeds) {
      translatedEmbeds.push(await translateEmbedObject(emb, userId));
    }
    newOptions.embeds = translatedEmbeds;
  }

  if (newOptions.components) {
    newOptions.components = await translateComponents(
      newOptions.components,
      userId
    );
  }

  if (
    (!newOptions.content || newOptions.content === "") &&
    (!newOptions.embeds || newOptions.embeds.length === 0) &&
    (!newOptions.components || newOptions.components.length === 0)
  ) {
    return null;
  }

  return newOptions;
}


function patchAll() {
  if (Interaction && Interaction.prototype) {
    ["reply", "followUp", "editReply", "update"].forEach((fn) => {
      if (!Interaction.prototype[`_${fn}`])
        Interaction.prototype[`_${fn}`] = Interaction.prototype[fn];

      Interaction.prototype[fn] = async function (options) {
        try {
          const userId =
            this.user?.id || this.member?.user?.id || this.author?.id || null;
          const newOptions = await handleOptions(options, userId);
          if (!newOptions) return;
          return this[`_${fn}`](newOptions);
        } catch (err) {
          console.error(`Çeviri hatası (interaction.${fn}):`, err);
          return this[`_${fn}`](options);
        }
      };
    });
  }

  if (Message && Message.prototype) {
    if (!Message.prototype._reply)
      Message.prototype._reply = Message.prototype.reply;

    Message.prototype.reply = async function (options) {
      try {
        const userId = this.author?.id; 
        const newOptions = await handleOptions(options, userId);
        if (!newOptions) return;
        return this._reply(newOptions);
      } catch (err) {
        console.error("Çeviri hatası (message.reply):", err);
        return this._reply(options);
      }
    };

    if (!Message.prototype._edit)
      Message.prototype._edit = Message.prototype.edit;

    Message.prototype.edit = async function (options) {
      try {
        const userId = await getTargetUserId({
          options,
          thisMessage: this,
          channel: this.channel,
        });
        const newOptions = await handleOptions(options, userId);
        if (!newOptions) return this._edit(options); 
        return this._edit(newOptions);
      } catch (err) {
        console.error("Çeviri hatası (message.edit):", err);
        return this._edit(options);
      }
    };
  }

  const channelClasses = [TextChannel, DMChannel, NewsChannel, ThreadChannel];
  for (const C of channelClasses) {
    if (!C || !C.prototype) continue;
    if (!C.prototype._send) C.prototype._send = C.prototype.send;

    C.prototype.send = async function (options) {
      try {
        let userId = options?.userId || null;

        if (!userId) {
          const detected = await getTargetUserId({
            options,
            thisMessage: null,
            channel: this,
          });
          userId = detected || null;
        }

        const newOptions = await handleOptions(options, userId);
        if (!newOptions) return; 
        return this._send(newOptions);
      } catch (err) {
        console.error(`Çeviri hatası (send) ${C.name}:`, err);
        return this._send(options);
      }
    };
  }

  if (WebhookClient && WebhookClient.prototype) {
    if (!WebhookClient.prototype._send)
      WebhookClient.prototype._send = WebhookClient.prototype.send;

    WebhookClient.prototype.send = async function (options) {
      try {
        let userId = options?.userId || null;
        if (!userId && this?.client && this.client.channels) {
        }

        const newOptions = await handleOptions(options, userId);
        if (!newOptions) return;
        return this._send(newOptions);
      } catch (err) {
        console.error("Çeviri hatası (WebhookClient.send):", err);
        return this._send(options);
      }
    };
  }

}

module.exports = {
  patchAll,
  getUserLang,
  setUserLang,
  deleteUserLang,
};
