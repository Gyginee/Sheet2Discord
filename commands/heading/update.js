const {
    SlashCommandSubcommandBuilder,
} = require("discord.js");


const database = require("../../database/sheetsToDiscordLinks");
exports.run = async (client, interaction) => {
    const uuid = interaction.options.getString("uuid");
    const enable = Boolean(interaction.options.getString('enable'));
    const headingName = interaction.options.getString("heading");

    await interaction.deferReply();

    const res = await database.findOne({ uuid });
    if (!res) {
        return interaction.editReply({ content: 'Không có liên kết nào có UUID mà bạn cung cấp!' })
    };


    const existingHeaderSetting = res.headingsSettings.get(headingName);


    if (!existingHeaderSetting && enable) {
        res.headingsSettings.set(headingName, {
            announceWhenUpdate: true,
            title: headingName
        })
        await res.save();
    } else if (existingHeaderSetting) {
        existingHeaderSetting.announceWhenUpdate = enable
        await res.save();
    }

    return interaction.editReply({ content: `Cài đặt liên kết được thay đổi thành công!` });
}

exports.info = {
    name: "update",
    slash: new SlashCommandSubcommandBuilder()
        .setName("update")
        .setDescription(
            "Cài đặt cập nhật thay đổi tiêu đề cụ thể khi đăng bài từ Google Sheet qua mục comment"
        )
        .addStringOption((option) =>
            option
                .setName("uuid")
                .setDescription("UUID của liên kết muốn thay đổi cài đặt. Tất cả liên kết: /link list")
                .setRequired(true)
        )
        .addStringOption((option) =>
        option
            .setName("heading")
            .setDescription("Tên của tiêu đề mà bạn muốn thay đổi cài đặt. Gõ chính xác!")
            .setRequired(true)
    )
        .addStringOption((option) =>
        option
        .setChoices({
            name: 'Tắt',
            value: 'false'
        }, {
            name: 'Bật',
            value: 'true'
        })
            .setName("enable")
            .setDescription("Chỉnh tắt hoặc bật cập nhật tiêu đề qua comment nếu được thay đổi")
            .setRequired(true)
    )
};