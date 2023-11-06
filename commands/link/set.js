const {
    StringSelectMenuBuilder,
    SlashCommandSubcommandBuilder,
    ChannelType,
    EmbedBuilder,
    ButtonBuilder,
    ActionRowBuilder,
    ButtonStyle,
    Collection
} = require("discord.js");
const { confirmationButton } = require("../../handler/Util");
const database = require("../../database/sheetsToDiscordLinks");
const { v4: uuidv4 } = require('uuid');

const { convertTo24HourFormat } = require("../../handler/Util");
const schedule = require("node-schedule");
const posting = require('../../scheduling/postingForum');

const { google } = require("googleapis");
const { JWT } = require("google-auth-library");

const keys = require("../../jwt.json");

exports.run = async (client, interaction) => {
    const channel = interaction.options.getChannel("channel");
    const spreadSheetLink = interaction.options.getString("sheets-link");

    const spreadsheetId = extractGoogleSheetsId(spreadSheetLink);
    if (!spreadsheetId || !isValidGoogleSheetsUrl(spreadSheetLink)) {
        return interaction.reply({
            content: `Bạn đã cung cấp link sai. Vui lòng sử dụng link Google Sheet theo định dạng dưới đây: https://docs.google.com/spreadsheets/d/1svqReK_quKQ4UY6kfYzrIei8moX-Ywbu_ciBT-3B5S0/`,
            ephemeral: true,
        });
    }

    const embed = new EmbedBuilder()
        .setTitle("Cấp quyền truy cập Google Sheets")
        .setFooter({
            text: "Trình cài đặt sẽ tự hủy sau 30 giây nếu không có phản hồi",
        })
        .setImage("https://s6.gifyu.com/images/S6XzI.gif")
        .setDescription(
            `Để khởi tạo link giữa kênh ${channel.toString()} và link Google Sheet bạn cung cấp, bạn hãy để quyền truy cập của trang tính thành **công khai** hoặc cho email \`${
                keys.client_email
            }\` quyền truy cập vào trang tính.\nSetup sẽ **chỉ tiếp tục** nếu bạn làm một trong 2 bước trên.\n\nNhấn **Tiếp tục** để bot check quyền truy cập. Nhấn **Hủy** để bỏ thiết lập link Google Sheet. Bạn có tối đa 10 lần thử.\n**LƯU Ý: Bot chỉ nhận những link Google Sheet thuần, nếu link của bạn là link Google Sheet hiển thị file Excel (đuôi .XLSX) bot sẽ không đọc được.**`
        );
    const row = new ActionRowBuilder().addComponents([
        new ButtonBuilder()
            .setLabel("Tiếp tục")
            .setCustomId("continuebtn")
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setLabel("Hủy")
            .setCustomId("cancelbtn")
            .setStyle(ButtonStyle.Danger),
    ]);
    const originalMsgObj = {
        embeds: [embed],
    };
    const msg = await interaction.reply({
        ...originalMsgObj,
        components: [row],
        fetchReply: true,
    });
    const filter = async (res) => {
        if (res.user.id !== interaction.user.id) {
            res.reply({
                content: `Chỉ có ${interaction.user.toString()} có thể thực thi những thực hiện này.`,
                ephemeral: true,
            });
            return false;
        } else return true;
    };

    let verified = false;
    let sheetList;
    let spreadSheetTitle;

    let tryCount = 0;
    const maxTries = 10;
    while (!verified) {
        const response = await confirmationButton(
            interaction,
            msg,
            row,
            filter,
            originalMsgObj
        );
        if (!response.endValue) return;
        await response.res.deferReply({ ephemeral: true });

        const sheets = google.sheets("v4");

        const auth = new JWT({
            email: keys.client_email,
            key: keys.private_key,
            scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
        });
        const fetchNames = () => {
            return new Promise(async (resolve, reject) => {
                try {
                    sheets.spreadsheets.get(
                        {
                            spreadsheetId,
                            auth,
                        },
                        (err, res) => {
                            if (err) {
                                resolve({ err });
                            } else {
                                const responses = res.data.sheets;
                                spreadSheetTitle = res.data.properties.title; 
                                resolve({ sheets: responses });
                            }
                        }
                    );
                } catch (error) {
                    resolve({ err: error, noContinue: true });
                }
            });
        };

        tryCount += 1;
        const res = await fetchNames();
        if (res.err && res.noContinue) {
            response.res.editReply({
                content: `Đã có lỗi trong khi truy cập với máy chủ Google. Bạn có thể liên hệ admin hoặc thử lại sau.\nChi tiết lỗi: ${err}`,
            });
            return interaction.editReply({
                components: [row],
                ...originalMsgObj,
            });
        } else if (Boolean(res.err)) {
            if (tryCount >= maxTries) {
                response.res.editReply({
                    content: `Bạn đã thử lại quá số lần cho phép. Hãy chạy lại lệnh này sau khi đã mở quyền truy cập.`,
                });
                row.components.forEach((button) => button.setDisabled(true));
                return msg.edit({
                    ...originalMsgObj,
                    components: [row],
                });
            } else {
                response.res.editReply({
                    content: `Không thể truy cập vào link Google Sheet của bạn do thiếu quyền hoặc link Google Sheet là link hiển thị file Excel. Bạn có thể nhấn vào **Tiếp tục** để bot check lại quyền. Bạn còn lại ${maxTries - tryCount} lần thử với trình cài đặt này.`,
                });
                continue;
            }
        } else {
            verified = true;
            sheetList = res.sheets;
            response.res.editReply({
                content:
                    "Bot đã xác nhận quyền truy cập vào link Google Sheet thành công! Bạn hãy thực hiện bước tiếp theo như bên dưới!",
            });
            row.components.forEach((button) => button.setDisabled(true));
            msg.edit({
                ...originalMsgObj,
                components: [row],
            });
        }
    }
    const sheetNames = sheetList
        .map((sheet) => sheet.properties.title)
        .map((name, i) => {
            return {
                label: name,
                value: i.toString(),
            };
        })
        .slice(0, 25);
    const row2 = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId("sheetsnames")
            .setPlaceholder("Chọn bảng tính mà bạn muốn dùng")
            .setMinValues(1)
            .setMaxValues(sheetNames.length)
            .setOptions(sheetNames)
    );
    const row3 = new ActionRowBuilder().addComponents([
        new ButtonBuilder()
            .setLabel("Hủy")
            .setCustomId("cancelbtn")
            .setStyle(ButtonStyle.Danger),
    ]);
    const embed2 = new EmbedBuilder()
        .setTitle("Hãy chọn bảng tính của bạn")
        .setFooter({
            text: "Trình cài đặt sẽ tự hủy sau 30 giây nếu không có phản hồi",
        })
        .setImage("https://i.imgur.com/wDxDi83.png")
        .setDescription(
            `Hãy chọn những bảng tính mà bạn muốn liên kết với kênh ${channel.toString()}. Một link có thể bao gồm nhiều bảng tính, như hình dưới.\n\nDiscord giới hạn 25 mục cho một menu chọn, vậy nếu bạn không thể tìm thấy bảng tính của mình, vui lòng nhấn **Hủy** và copy bảng tính của mình sang một link khác.`
        );

    const msg2 = await interaction.followUp({
        embeds: [embed2],
        components: [row2, row3],
        fetchReply: true,
    });

    const fetchMenuResponse = () => {
        let cancelled = false;
        return new Promise(async (resolve, reject) => {
            const collector = msg2.createMessageComponentCollector({
                filter,
                time: 30000,
            });

            collector.on("collect", async (res) => {
                switch (res.customId) {
                    case "cancelbtn":
                        cancelled = true
                        collector.stop();
                        break;
                    case "sheetsnames":
                        collector.stop();
                        break;
                }
            });
            collector.on("end", async (collected, reason) => {
                row2.components.forEach((button) => button.setDisabled(true));
                row3.components.forEach((button) => button.setDisabled(true));
                if (!collected.size) {
                    msg2.edit({
                        components: [row2, row3],
                        embeds: [embed2],
                    });
                } else {
                    const res = collected.find(r => r.customId === 'sheetsnames')
                    collected.first().update({
                        components: [row2, row3],
                        embeds: [embed2],
                    });
                    if (Boolean(res) && !cancelled) {
                        resolve(res.values)
                    } else {
                        resolve(null)
                    }
                }
            });
        });
    };

    const endValues = await fetchMenuResponse();
    if (!endValues || !endValues.length) return;

    const filteredSheets = endValues.map((i) => sheetList[i]);

    try {
        const sheets = google.sheets("v4");

        const auth = new JWT({
            email: keys.client_email,
            key: keys.private_key,
            scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
        });
        const filteredSheetsInfo = [];
        for (const sheet of filteredSheets) {
            const response = await sheets.spreadsheets.values.get({
                spreadsheetId,
                range: sheet.properties.title,
                valueRenderOption: 'FORMATTED_VALUE',
                auth
            }).catch((err) => {
                throw new Error('googleApiError')
            });

            const sheetUUID = uuidv4();
            filteredSheetsInfo.push({
                uuid: sheetUUID,
                channelId: channel.id,
                spreadsheetId,
                sheetId: sheet.properties.sheetId,
                guildId: interaction.guild.id,
                startingFetchRowNumber: 0
            });


            const values = response.data.values || [];

        
            if (!values.length) continue;

            const newData = new Collection();

            for (let i = 0; i < values.length; i++) {
                const row = values[i];
        
                const uuid = uuidv4();
                newData.set(uuid, {
                    uuid,
                    data: row,
                    rowIndex: i,
                    initializedRow: true
                });
            };
            const dataArray = [...newData.values()];

            filteredSheetsInfo.find(x => x.uuid === sheetUUID).previousData = dataArray;
        }

        const isRecordExist = async (record) => {
            const existingRecord = await database.findOne({
                channelId: record.channelId,
                spreadsheetId: record.spreadsheetId,
                sheetId: record.sheetId,
                guildId: record.guildId
            });
            return !!existingRecord;
        };

        
        const newSheetsInfo = [];
        for (const sheetInfo of filteredSheetsInfo) {
            if (!(await isRecordExist(sheetInfo))) {
                newSheetsInfo.push(sheetInfo);
            }
        }

        if (!newSheetsInfo.length) return interaction.followUp({
            content: 'Các liên kết đã có sẵn! Không có liên kết nào được thêm hoặc thay đổi.',
            ephemeral: true
        });

        const savedDocuments = await database.insertMany(newSheetsInfo);

        for (const newSheetData of savedDocuments) {
            const { scheduleHour, amPm, uuid } = newSheetData;
            const hour = convertTo24HourFormat(scheduleHour, amPm);
            
            const rule = new schedule.RecurrenceRule();
            rule.hour = hour;
            rule.minute = 0;
            rule.tz = "Asia/Ho_Chi_Minh";
    
            const job = schedule.scheduleJob(rule, function () {
                posting(client, uuid)
            });
            client.scheduleManager.set(uuid, job);
        }

        const embed2 = new EmbedBuilder()
        .setTitle(`${newSheetsInfo.length} liên kết đã được lưu thành công!`)
        .setDescription(newSheetsInfo.map((sheet) =>`🡆 **${filteredSheets.find(s => s.properties.sheetId === sheet.sheetId).properties.title}** ([${spreadSheetTitle}](${spreadSheetLink})), bắt đầu theo dõi từ hàng thứ **${sheet.startingFetchRowNumber + 1}**.\nUUID: \`${sheet.uuid}\``).join('\n'))
        .setFooter({ text: 'Những liên kết mới sẽ mặc định đăng bài mỗi ngày lúc 12 giờ chiều với giới hạn đăng 5 bài mỗi ngày.' });

        return interaction.followUp({
            embeds: [embed2],
        });
    } catch (error) {
        client.logger.error(error);
        if (error.message === 'googleApiError') return interaction.followUp({ content: 'Đã có lỗi trong khi truy cập dữ liệu từ máy chủ Google. Vui lòng kiểm tra lại bảng tính và quyền truy cập bảng tính, và thử lại sau.' })
        else return interaction.followUp({
            content: `Đã xảy ra lỗi trong khi lưu thông tin liên kết vào hệ thống. Vui lòng liên hệ admin.\nLỗi: ${error.message}`,
            ephemeral: true
        });
    }
};

exports.info = {
    name: "set",
    slash: new SlashCommandSubcommandBuilder()
        .setName("set")
        .setDescription(
            "Tạo liên kết mới giữa bảng tính Google Sheets và Discord."
        )
        .addStringOption((option) =>
            option
                .setName("sheets-link")
                .setDescription("Link Google Sheets mà bạn muốn liên kết.")
                .setRequired(true)
        )
        .addChannelOption((option) =>
            option
                .setName("channel")
                .setDescription("Kênh đích để gửi dữ liệu từ Google Sheet.")
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildForum)
        ),
};

function extractGoogleSheetsId(url) {
    const googleSheetsRegex = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;
    const match = url.match(googleSheetsRegex);

    if (match && match[1]) {
        return match[1];
    } else {
        return null; // Invalid URL
    }
}

function isValidGoogleSheetsUrl(url) {
    const googleSheetsRegex = /https:\/\/docs\.google\.com\/spreadsheets/;
    return googleSheetsRegex.test(url);
}

function arraysEqual(arr1, arr2) {
    if (arr1.length !== arr2.length) return false;
    for (let i = 0; i < arr1.length; i++) {
        if (arr1[i] !== arr2[i]) return false;
    }
    return true;
}
