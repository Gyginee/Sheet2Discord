const database = require("../../database/sheetsToDiscordLinks");

const { google } = require("googleapis");
const { JWT } = require("google-auth-library");

const keys = require("../../jwt.json");

const displaySetting = {
    '1': 'Tắt tiêu đề',
    '2': 'Bật tiêu đề',
    '3': 'Tắt tiêu đề và nội dung'
}

const {
    SlashCommandSubcommandBuilder,
    EmbedBuilder
} = require("discord.js");

const {
    pagination,
    ButtonTypes,
    ButtonStyles
} = require('@devraelfreeze/discordjs-pagination');
exports.run = async (client, interaction) => {
    const uuid = interaction.options.getString("uuid");


    await interaction.deferReply();

    const res = await database.findOne({
        uuid
    });
    if (!res) {
        return interaction.editReply({
            content: 'Không có liên kết nào có UUID mà bạn cung cấp!'
        })
    };

    const existingHeaderSettings = res.headingsSettings;

    if (!existingHeaderSettings || !existingHeaderSettings.size) {
        return interaction.editReply({
            content: 'Không có cài đặt tiêu đề có sẵn để hiển thị!'
        })
    };


    const sheets = google.sheets("v4");

    const auth = new JWT({
        email: keys.client_email,
        key: keys.private_key,
        scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });
    const response = await sheets.spreadsheets.get({
        spreadsheetId: res.spreadsheetId,
        auth
    }).catch(() => null);

    const sheetData = {
        uuid: res.uuid,
        startingFetchRowNumber: res.startingFetchRowNumber,
        spreadSheetLink: `https://docs.google.com/spreadsheets/d/${res.spreadsheetId}/`,
        spreadSheetTitle: response?.data?.properties?.title || 'Link',
        sheetName: response?.data?.sheets?.find(s => s.properties.sheetId == res.sheetId).properties?.title || 'N/A',
        channelId: res.channelId,
        amPm: res.amPm,
        scheduleHour: res.scheduleHour,
        limitPerDay: res.limitPerDay
    }

    const objects = [];

    existingHeaderSettings.forEach(item => objects.push(item))

    const itemsPerPage = 5;
    const paginatedPages = [];

    // Group items by type first
    const typeGroups = {};
    const remainingItems = [];

    for (const obj of objects) {
        let display = `🡆 **${obj.title}** ${obj.displayName ? `(Tên hiển thị: ${obj.displayName})` : ''}\n- Comment dưới post khi cập nhật: ${obj.announceWhenUpdate ? 'BẬT' : 'TẮT'}\n- Cài đặt hiển thị: ${obj.shown ? displaySetting[obj.shown] : 'Tắt tiêu đề'}\n- Quyền ưu tiên làm tên bài: ${obj.titlePriority ? 'BẬT' : 'TẮT'}`
        if (obj.group) {
            if (!typeGroups[obj.group]) {
                typeGroups[obj.group] = [];
            }
            typeGroups[obj.group].push(display);
        } else {
            remainingItems.push(display);
        }
    }

    // Paginate the grouped items
    for (const type in typeGroups) {
        const group = typeGroups[type];
        while (group.length > 0) {
            const page = group.splice(0, itemsPerPage);
            paginatedPages.push({
                type,
                items: page
            });
        }
    }

    // Paginate the remaining items 
    while (remainingItems.length > 0) {
        const page = remainingItems.splice(0, itemsPerPage);
        paginatedPages.push({
            type: "Remaining",
            items: page
        });
    }

    const paginatedEmbeds = paginatedPages.map((page, i) => {
        let string = `**${sheetData.sheetName}** ([${sheetData.spreadSheetTitle}](${sheetData.spreadSheetLink})) 🡆 <#${sheetData.channelId}>. Đang theo dõi từ hàng **${sheetData.startingFetchRowNumber + 1} trở đi**\nUUID: \`${sheetData.uuid}\`\n\n`;
        if (page.type !== "Remaining") {
            string += (`____**GROUP: ${page.type}**____\n`);
        }
        string += page.items.join('\n');

        const embed = new EmbedBuilder()
            .setTitle("Danh sách cài đặt tiêu đề liên kết")
            .setDescription(string)
        return embed    
    });

    if (paginatedEmbeds.length > 1) {
        
        await pagination({
            embeds: paginatedEmbeds,
            author: interaction.user,
            interaction,
            ephemeral: true,
            time: 60000,
            disableButtons: true,
            fastSkip: true,
            buttons: [
                {
                    type: ButtonTypes.first,
                    emoji: '⏪',
                    style: ButtonStyles.Secondary
                },
                {
                    type: ButtonTypes.previous,
                    emoji: '⬅️',
                    style: ButtonStyles.Secondary
                },
                {
                    type: ButtonTypes.next,
                    emoji: '➡️',
                    style: ButtonStyles.Secondary
                },
                {
                    type: ButtonTypes.last,
                    emoji: '⏩',
                    style: ButtonStyles.Secondary
                }
            ]
        });
    } else {
        return interaction.editReply({ embeds: [paginatedEmbeds[0]] })
    }

}

exports.info = {
    name: "setting-list",
    slash: new SlashCommandSubcommandBuilder()
        .setName("setting-list")
        .setDescription(
            "Hiển thị cài đặt của tất cả tiêu đề trong một liên kết"
        )
        .addStringOption((option) =>
            option
            .setName("uuid")
            .setDescription("UUID của liên kết bạn muốn hiển thị cài đặt tiêu đề. Tất cả liên kết: /link list")
            .setRequired(true)
        )
};