const { SlashCommandSubcommandBuilder } = require("discord.js");
const schedule = require("node-schedule");

const database = require("../../database/sheetsToDiscordLinks");

const { convertTo24HourFormat } = require("../../handler/Util");

exports.run = async (client, interaction) => {
    const uuid = interaction.options.getString("uuid");
    const hour = interaction.options.getNumber("hour");
    const ampm = interaction.options.getString("ampm");

    await interaction.deferReply();

    const res = await database.findOneAndUpdate(
        { uuid },
        { scheduleHour: hour, amPm: ampm }
    );
    if (!res) {
        return interaction.editReply({
            content:
                "Không có liên kết nào có UUID mà bạn cung cấp, vì vậy không có liên kết nào bị thay đổi.",
        });
    } else {
        const parsedHour = convertTo24HourFormat(hour, ampm);

        const rule = new schedule.RecurrenceRule();
        rule.hour = parsedHour;
        rule.minute = 0;
        rule.tz = "Asia/Ho_Chi_Minh";

        const job = client.scheduleManager.get(uuid);
        job.reschedule(rule);

        return interaction.editReply({
            content: `Cài đặt liên kết được thay đổi thành công!`,
        });
    }
};

exports.info = {
    name: "schedule",
    slash: new SlashCommandSubcommandBuilder()
        .setName("schedule")
        .setDescription(
            "Đặt lịch đăng bài mỗi khi có nội dung mới trong Google Sheet"
        )
        .addStringOption((option) =>
            option
                .setName("uuid")
                .setDescription(
                    "UUID của liên kết muốn thay đổi cài đặt. Tất cả liên kết: /link list"
                )
                .setRequired(true)
        )
        .addNumberOption((option) =>
            option
                .setName("hour")
                .setDescription("Giờ bạn muốn đặt để đăng bài lên kênh.")
                .addChoices(
                    {
                        value: 1,
                        name: "1",
                    },
                    {
                        value: 2,
                        name: "2",
                    },
                    {
                        value: 3,
                        name: "3",
                    },
                    {
                        value: 4,
                        name: "4",
                    },
                    {
                        value: 5,
                        name: "5",
                    },
                    {
                        value: 6,
                        name: "6",
                    },
                    {
                        value: 7,
                        name: "7",
                    },
                    {
                        value: 8,
                        name: "8",
                    },
                    {
                        value: 9,
                        name: "9",
                    },
                    {
                        value: 10,
                        name: "10",
                    },
                    {
                        value: 11,
                        name: "11",
                    },
                    {
                        value: 12,
                        name: "12",
                    }
                )
                .setRequired(true)
        )
        .addStringOption((option) =>
            option
                .setName("ampm")
                .setDescription("Đặt lịch sáng hoặc chiều.")
                .addChoices(
                    {
                        name: "Sáng",
                        value: "am",
                    },
                    {
                        name: "Chiều",
                        value: "pm",
                    }
                )
                .setRequired(true)
        ),
};
