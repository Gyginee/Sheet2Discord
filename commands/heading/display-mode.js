const {
    SlashCommandSubcommandBuilder,
} = require("discord.js");


const database = require("../../database/sheetsToDiscordLinks");
exports.run = async (client, interaction) => {
    const uuid = interaction.options.getString("uuid");
    const enable = interaction.options.getString('display-setting');
    const headingName = interaction.options.getString("heading");

    await interaction.deferReply();

    const res = await database.findOne({ uuid });
    if (!res) {
        return interaction.editReply({ content: 'Không có liên kết nào có UUID mà bạn cung cấp!' })
    };


    const existingHeaderSetting = res.headingsSettings.get(headingName);


    if (!existingHeaderSetting) {
        res.headingsSettings.set(headingName, {
            shown: enable,
            title: headingName
        })
        await res.save();
    } else if (existingHeaderSetting) {
        existingHeaderSetting.shown = enable
        await res.save();
    }

    return interaction.editReply({ content: `Cài đặt liên kết được thay đổi thành công!` });
}

exports.info = {
    name: "display-mode",
    slash: new SlashCommandSubcommandBuilder()
        .setName("display-mode")
        .setDescription(
            "Cài đặt hiển thị tiêu đề và nội dung khi đăng bài từ Google Sheet. Mặc định: Tắt tiêu đề."
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
            name: 'Tắt tiêu đề',
            value: '1'
        }, {
            name: 'Bật tiêu đề',
            value: '2'
        }, {
            name: 'Tắt tiêu đề và nội dung',
            value: '3'
        })
            .setName("display-setting")
            .setDescription("Chế độ hiển thị cho tiêu đề")
            .setRequired(true)
    )
};