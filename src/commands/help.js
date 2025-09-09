const {
  MessageEmbed,
  MessageActionRow,
  MessageButton,
  MessageSelectMenu,
} = require("discord.js");

exports.help = {
  name: "help",
  aliases: ["h", "yardım"],
  usage: "help",
  category: "Bot",
  description:
    "Gelişmiş yardım arayüzü — kategori, arama, toggle (gizli komutları göster).",
};

exports.execute = async (client, message /*, args */) => {
  try {
    const prefix = client.config?.prefix || "";
    const ownerId = client.config?.ownerId || "";
    const admins = client.config?.admins || [];

    // emojis.json benzeri yapı: client.config.emojis veya varsayılan
    const emojis =
      client.config?.emojis || { bot: { succes: "✅", error: "❌" } };

    const isOwner = message.author.id === ownerId;
    const isAdmin = admins.includes(message.author.id);

    const memberHasAnyPerm = (perms = []) => {
      if (!message.member || !message.member.permissions) return false;
      if (!Array.isArray(perms)) perms = [perms];
      return perms.some((p) => message.member.permissions.has(p));
    };

    const allCmds = Array.from(client.commands.values());

    const resolveVisibleCommands = (showAll = false) =>
      allCmds.filter((cmd) => {
        if (showAll) return true;
        const help = cmd.help || {};
        const cat = help.category || "Diğer";
        if (help.admin && !isOwner && !isAdmin) return false;
        if (
          help.permissions &&
          Array.isArray(help.permissions) &&
          help.permissions.length
        ) {
          if (!memberHasAnyPerm(help.permissions) && !isOwner) return false;
        }
        return true;
      });

    const buildCategories = (cmdList) => {
      const cats = {};
      cmdList.forEach((cmd) => {
        const cat = cmd.help?.category || "Diğer";
        if (!cats[cat]) cats[cat] = [];
        cats[cat].push(cmd);
      });
      return cats;
    };

    let showAll = false;
    let visibleCommands = resolveVisibleCommands(showAll);
    let categories = buildCategories(visibleCommands);
    let categoryNames = Object.keys(categories).sort();

    const PRIMARY_COLOR = "#0b84ff";
    const SECONDARY_COLOR = "#2f3136";
    const CARD_COLOR = "#1f2326";

    const makeHeroEmbed = () => {
      const total = allCmds.length;
      const visible = visibleCommands.length;
      const emb = new MessageEmbed()
        .setTitle(`✨ ${client.user.username} — Yardım Merkezi`)
        .setDescription(
          `${showAll ? `${emojis.bot.succes} | ` : ""}Aşağıdan bir kategori seç veya 🔎 Ara butonunu kullanarak komutlarda arama yap.`
        )
        .addField("Görünen komutlar", `${visible}`, true)
        .addField("Toplam komut", `${total}`, true)
        .setColor(PRIMARY_COLOR)
        .setFooter({
          text: `İsteyen: ${
            message.member ? message.member.displayName : message.author.username
          }`,
          iconURL: message.author.displayAvatarURL(),
        })
        .setTimestamp();

      const thumb =
        message.guild?.iconURL({ dynamic: true }) ||
        client.user.displayAvatarURL({ dynamic: true });
      emb.setThumbnail(thumb);

      return emb;
    };

    const makeCategorySelect = () => {
      const options = categoryNames.map((cat) => ({
        label: cat,
        value: `help_select_${encodeURIComponent(cat)}`,
        description: `${(categories[cat] || []).length} komut`,
      }));
      const select = new MessageSelectMenu()
        .setCustomId("help_select")
        .setPlaceholder("Kategori seç")
        .addOptions(options.slice(0, 25));
      return new MessageActionRow().addComponents(select);
    };

    const makeMainButtons = () =>
      new MessageActionRow().addComponents(
        new MessageButton()
          .setCustomId("help_toggle")
          .setLabel(showAll ? "🔒 Gizle (izinli komutlar)" : "🔓 Göster (izinli komutlar)")
          .setStyle(showAll ? "SECONDARY" : "PRIMARY"),
        new MessageButton().setCustomId("help_search").setLabel("🔎 Ara").setStyle("SECONDARY"),
        new MessageButton().setCustomId("help_home").setLabel("🏠 Ana Sayfa").setStyle("SECONDARY"),
        new MessageButton().setCustomId("help_close").setLabel("❌ Kapat").setStyle("DANGER")
      );

    const buildCategoryPage = (category, page = 0) => {
      const cmds = categories[category] || [];
      const perPage = 6;
      const totalPages = Math.max(1, Math.ceil(cmds.length / perPage));
      const slice = cmds.slice(page * perPage, page * perPage + perPage);

      const emb = new MessageEmbed()
        .setTitle(`📂 ${category} — ${cmds.length} komut`)
        .setColor(CARD_COLOR)
        .setFooter({
          text: `Sayfa ${page + 1}/${totalPages} • ${
            message.member ? message.member.displayName : message.author.username
          }`,
          iconURL: message.author.displayAvatarURL(),
        })
        .setTimestamp();

      slice.forEach((c, i) => {
        const index = page * perPage + i + 1;
        const name = `${index}. \`${prefix}${c.help.name}\``;
        const desc = c.help?.description || "-";
        const usage = c.help?.usage || "-";
        emb.addField(name, `${desc}\n**Kullanım:** \`${prefix}${usage}\``, false);
      });

      return { embed: emb, totalPages };
    };

    const makeCategoryNav = (category, page, totalPages) => {
      const row = new MessageActionRow();
      if (page > 0)
        row.addComponents(
          new MessageButton()
            .setCustomId(`help_prev_${encodeURIComponent(category)}_${page}`)
            .setLabel("⬅️ Geri")
            .setStyle("SECONDARY")
        );
      row.addComponents(
        new MessageButton().setCustomId("help_home").setLabel("🏠 Ana Sayfa").setStyle("SECONDARY")
      );
      if (page < totalPages - 1)
        row.addComponents(
          new MessageButton()
            .setCustomId(`help_next_${encodeURIComponent(category)}_${page}`)
            .setLabel("İleri ➡️")
            .setStyle("SECONDARY")
        );
      row.addComponents(
        new MessageButton()
          .setCustomId("help_toggle")
          .setLabel(showAll ? "🔒 Gizle" : "🔓 Göster")
          .setStyle(showAll ? "SECONDARY" : "PRIMARY")
      );
      row.addComponents(
        new MessageButton().setCustomId("help_close").setLabel("❌ Kapat").setStyle("DANGER")
      );
      return row;
    };

    const initialRows = [makeCategorySelect(), makeMainButtons()];
    const helpMsg = await message.channel.send({
      embeds: [makeHeroEmbed()],
      components: initialRows,
    });

    const collector = helpMsg.createMessageComponentCollector({
      filter: (i) => i.user.id === message.author.id,
      time: 150_000,
    });

    let currentCategory = null;
    let currentPage = 0;

    collector.on("collect", async (interaction) => {
      await interaction.deferUpdate().catch(() => {});

      const cid = interaction.customId;

      if (cid === "help_toggle") {
        showAll = !showAll;
        visibleCommands = resolveVisibleCommands(showAll);
        categories = buildCategories(visibleCommands);
        categoryNames = Object.keys(categories).sort();
        await interaction.editReply({
          embeds: [makeHeroEmbed()],
          components: [makeCategorySelect(), makeMainButtons()],
        });
        return;
      }

      if (cid === "help_search") {
        await interaction.followUp({
          content: `${emojis.bot.succes} | Arama modu aktif. Lütfen kanala aramak istediğiniz terimi yazın (30s).`,
          ephemeral: true,
        });
        const filter = (m) => m.author.id === message.author.id;
        const collected = await message.channel.awaitMessages({
          filter,
          max: 1,
          time: 30_000,
        });
        const term = collected.first()?.content?.trim();
        if (!term) {
          await interaction.followUp({
            content: `${emojis.bot.error} | ⏱ | **${
              message.member ? message.member.displayName : message.author.username
            }**, lütfen biraz yavaş ol~ bana göre çok hızlısın :c`,
            ephemeral: true,
          });

          return interaction.editReply({
            embeds: [makeHeroEmbed()],
            components: [makeCategorySelect(), makeMainButtons()],
          });
        }

        const termLower = term.toLowerCase();
        const found = visibleCommands.filter((cmd) => {
          const help = cmd.help || {};
          return (
            help.name?.toLowerCase().includes(termLower) ||
            (help.description && help.description.toLowerCase().includes(termLower)) ||
            (help.usage && help.usage.toLowerCase().includes(termLower))
          );
        });

        if (!found.length) {
          const resEmb = new MessageEmbed()
            .setTitle(`${emojis.bot.error} | 🔎 Arama sonuçları: ${term}`)
            .setColor("#ff6b6b")
            .setDescription(`**${
              message.member ? message.member.displayName : message.author.username
            }**, aradığın şeye ulaşamadım... üzgünüm~ :c`)
            .setFooter({ text: `${found.length} sonuç bulundu` })
            .setTimestamp();

          return interaction.editReply({
            content: null,
            embeds: [resEmb],
            components: [makeCategorySelect(), makeMainButtons()],
          });
        }

        const resEmb = new MessageEmbed()
          .setTitle(`${emojis.bot.succes} | 🔎 Arama sonuçları: ${term}`)
          .setColor("#ffb142")
          .setFooter({
            text: `${found.length} sonuç bulundu • ${
              message.member ? message.member.displayName : message.author.username
            }`,
            iconURL: message.author.displayAvatarURL(),
          })
          .setTimestamp();

        found.slice(0, 25).forEach((c, i) => {
          const idx = i + 1;
          resEmb.addField(
            `\`${prefix}${c.help.name}\``,
            `${c.help.description || "-"}\nKullanım: \`${prefix}${c.help.usage || "-"}\``,
            false
          );
        });

        return interaction.editReply({
          content: null,
          embeds: [resEmb],
          components: [makeCategorySelect(), makeMainButtons()],
        });
      }

      if (cid === "help_home") {
        currentCategory = null;
        currentPage = 0;
        visibleCommands = resolveVisibleCommands(showAll);
        categories = buildCategories(visibleCommands);
        categoryNames = Object.keys(categories).sort();
        return interaction.editReply({
          embeds: [makeHeroEmbed()],
          components: [makeCategorySelect(), makeMainButtons()],
        });
      }

      if (cid === "help_close") {
        try {
          await helpMsg.delete();
        } catch (e) {}
        try {
          await message.delete();
        } catch (e) {}
        collector.stop();
        return;
      }

      if (cid === "help_select") {
        const raw = interaction.values?.[0];
        if (!raw) return;
        const encoded = raw.replace(/^help_select_/, "");
        const cat = decodeURIComponent(encoded);
        if (!categories[cat]) {
          visibleCommands = resolveVisibleCommands(showAll);
          categories = buildCategories(visibleCommands);
          if (!categories[cat])
            return interaction.editReply({ content: "Bu kategori bulunamadı.", embeds: [], components: [] });
        }
        currentCategory = cat;
        currentPage = 0;
        const { embed, totalPages } = buildCategoryPage(currentCategory, currentPage);
        const nav = makeCategoryNav(currentCategory, currentPage, totalPages);
        return interaction.editReply({ embeds: [embed], components: [nav] });
      }

      if (cid.startsWith("help_prev_") || cid.startsWith("help_next_")) {
        const parts = cid.split("_");
        const action = parts[1];
        const encodedCat = parts[2];
        const pageParam = Number(parts[3]) || 0;
        const cat = decodeURIComponent(encodedCat);

        if (!categories[cat]) {
          visibleCommands = resolveVisibleCommands(showAll);
          categories = buildCategories(visibleCommands);
          if (!categories[cat])
            return interaction.editReply({ content: "Kategori bulunamadı.", embeds: [], components: [] });
        }

        const perPage = 6;
        const totalPages = Math.max(1, Math.ceil((categories[cat] || []).length / perPage));
        currentPage = action === "prev" ? Math.max(0, pageParam - 1) : Math.min(totalPages - 1, pageParam + 1);

        const { embed, totalPages: tp } = buildCategoryPage(cat, currentPage);
        const nav = makeCategoryNav(cat, currentPage, tp);
        return interaction.editReply({ embeds: [embed], components: [nav] });
      }
    });

    collector.on("end", () => {
      helpMsg.edit({ components: [] }).catch(() => {});
    });
  } catch (err) {
    console.error("Help komutu hata:", err);
    message.channel.send("❌ Yardım menüsü oluşturulurken bir hata oluştu.");
  }
};
