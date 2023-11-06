const {
    SlashCommandSubcommandBuilder,
} = require("discord.js");

const database = require("../../database/sheetsToDiscordLinks");
exports.run = async (client, interaction) => {
    const uuid = interaction.options.getString("uuid");
    const uuid2 = interaction.options.getString("uuid2");

    await interaction.deferReply();

    const data1 = await database.findOne({ uuid })
    const data2 = await database.findOne({ uuid: uuid2 })


    if (!data1) {
        return interaction.editReply({ content: 'UUID của liên kết 1 không có trong hệ thống!' })
    } else if (!data2) {
        return interaction.editReply({ content: 'UUID của liên kết 2 không có trong hệ thống!' })
    } else {
        data2.headingsSettings = data1.headingsSettings
        data2.postExisting = data1.postExisting
        data2.startingFetchRowNumber = data1.startingFetchRowNumber
        data2.scheduleHour = data1.scheduleHour
        data2.amPm = data1.amPm
        data2.limitPerDay = data1.limitPerDay
        await data2.save()
        return interaction.editReply({ content: 'Copy cài đặt thành công!' })
    }
}

exports.info = {
    name: "delete",
    slash: new SlashCommandSubcommandBuilder()
        .setName("copy-setting")
        .setDescription(
            "Copy cài đặt từ một liên kết khác. Hỗ trợ giờ đăng, số lượng, và cài đặt tiêu đề"
        )
        .addStringOption((option) =>
            option
                .setName("uuid")
                .setDescription("UUID của liên kết gốc. Tất cả liên kết: /link list")
                .setRequired(true)
        )
        .addStringOption((option) =>
        option
            .setName("uuid2")
            .setDescription("UUID của liên kết bạn muốn copy sang. Tất cả liên kết: /link list")
            .setRequired(true)
    )
};