const {
    SlashCommandSubcommandBuilder,
    EmbedBuilder
} = require("discord.js");

const { pagination, ButtonTypes, ButtonStyles } = require('@devraelfreeze/discordjs-pagination');

const { google } = require("googleapis");
const { JWT } = require("google-auth-library");

const keys = require("../../jwt.json");


const database = require("../../database/sheetsToDiscordLinks");


exports.run = async (client, interaction) => {
    await interaction.deferReply();

    const data = await database.find({ guildId: interaction.guildId });

    if (!data.length) return interaction.editReply({ content: 'Chưa có liên kết nào được tạo! Bạn có thể tạo một liên kết mới với lệnh `/link set`' });

    const fullData = [];

    for (const sheet of data) {

        const sheets = google.sheets("v4");

        const auth = new JWT({
            email: keys.client_email,
            key: keys.private_key,
            scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
        });
        const response = await sheets.spreadsheets.get({
            spreadsheetId: sheet.spreadsheetId,
            auth
        }).catch(() => null);

        fullData.push({
            uuid: sheet.uuid,
            startingFetchRowNumber: sheet.startingFetchRowNumber,
            spreadSheetLink: `https://docs.google.com/spreadsheets/d/${sheet.spreadsheetId}/`,
            spreadSheetTitle: response?.data?.properties?.title || 'Link',
            sheetName: response?.data?.sheets?.find(s => s.properties.sheetId == sheet.sheetId).properties?.title || 'N/A',
            channelId: sheet.channelId,
            amPm: sheet.amPm,
            scheduleHour: sheet.scheduleHour,
            limitPerDay: sheet.limitPerDay,
            postExisting: sheet.postExisting
        })
    }

    if (fullData.length > 5) {
        const chunks = [];
        while (fullData.length) {
            const toAdd = fullData.splice(0, fullData.length >= 10 ? 10 : fullData.length);
            chunks.push(toAdd);
        };

        const arrEmbeds = chunks.map((arr, index) => {
            const embed = new EmbedBuilder()
                .setFooter({
                    text: `Trang ${index + 1} trên ${chunks.length}`,
                })
                .setTitle("Danh sách liên kết giữa Google Sheet và Discord")
                .setDescription(arr.map((sheet) => `• **${sheet.sheetName}** ([${sheet.spreadSheetTitle}](${sheet.spreadSheetLink})) 🡆 <#${sheet.channelId}>. Đang theo dõi từ hàng **${sheet.startingFetchRowNumber + 1}** trở đi. Đăng **${sheet.limitPerDay}** mỗi ngày lúc **${sheet.scheduleHour} giờ ${sheet.amPm == 'am' ? 'sáng' : 'chiều'}**\n${sheet.postExisting ? '**Liên kết này đang đăng từ những bài có sẵn trong Google Sheet.**\n' : ''}UUID: \`${sheet.uuid}\``).join('\n'));
            return embed;
        });

        await pagination({
            embeds: arrEmbeds,
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
        const embed = new EmbedBuilder()
            .setTitle("Danh sách liên kết giữa Google Sheet và Discord")
            .setDescription(fullData.map((sheet) => `• **${sheet.sheetName}** ([${sheet.spreadSheetTitle}](${sheet.spreadSheetLink})) 🡆 <#${sheet.channelId}>. Đang theo dõi từ hàng **${sheet.startingFetchRowNumber + 1}** trở đi. Đăng **${sheet.limitPerDay}** bài mỗi ngày lúc **${sheet.scheduleHour} giờ ${sheet.amPm == 'am' ? 'sáng' : 'chiều'}**\n${sheet.postExisting ? '**Liên kết này đang đăng từ những bài có sẵn trong Google Sheet.**\n' : ''}UUID: \`${sheet.uuid}\``).join('\n'));
        return interaction.editReply({ embeds: [embed] })
    }
}


exports.info = {
    name: "list",
    slash: new SlashCommandSubcommandBuilder()
        .setName("list")
        .setDescription(
            "Hiển thị tất cả liên kết giữa Google Sheet với Discord"
        )
};