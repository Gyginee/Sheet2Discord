const {
    SlashCommandSubcommandBuilder,
} = require("discord.js");

const database = require("../../database/sheetsToDiscordLinks");


exports.run = async (client, interaction) => {
    await interaction.deferReply();

    const number = interaction.options.getNumber("number");
    const uuid = interaction.options.getString("uuid");

    const res = await database.findOneAndUpdate(
        {
            uuid,
        },
        {
            limitPerDay: number
        }
    );

    if (!res) {
        return interaction.editReply({ content: 'Không có liên kết nào có UUID mà bạn cung cấp, vì vậy không có liên kết nào bị thay đổi.' })
    } else {
        return interaction.editReply({ content: `Cài đặt liên kết được thay đổi thành công!` })
    }
};


exports.info = {
    name: "limit",
    slash: new SlashCommandSubcommandBuilder()
        .setName("limit")
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
                .setName("number")
                .setDescription("Số lượng bài đăng mà bạn muốn đăng mỗi ngày.")
                .setMaxValue(10)
                .setMinValue(1)
                .setRequired(true)
        )
};
