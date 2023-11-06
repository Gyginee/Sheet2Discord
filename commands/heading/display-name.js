const {
    SlashCommandSubcommandBuilder,
} = require("discord.js");

const database = require("../../database/sheetsToDiscordLinks");
exports.run = async (client, interaction) => {
    const uuid = interaction.options.getString("uuid");
    const displayName = interaction.options.getString('display-name');

    const headingName = interaction.options.getString("heading");



    await interaction.deferReply();

    const res = await database.findOne({ uuid });
    if (!res) {
        return interaction.editReply({ content: 'Không có liên kết nào có UUID mà bạn cung cấp!' })
    };

    
    const existingHeaderSetting = res.headingsSettings.get(headingName);

    if (!existingHeaderSetting && Boolean(displayName)) {
        res.headingsSettings.set(headingName, {
            displayName,
            title: headingName,
        })
        await res.save();
    } else if (existingHeaderSetting) {
        existingHeaderSetting.displayName = displayName || undefined;
        await res.save();
    }

    return interaction.editReply({ content: `Cài đặt liên kết được thay đổi thành công!` });

}

exports.info = {
    name: "display-name",
    slash: new SlashCommandSubcommandBuilder()
        .setName("display-name")
        .setDescription(
            "Gọi tiêu đề đích bằng một tên gọi khác khi đăng bài từ Google Sheet"
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
            .setName("display-name")
            .setDescription("Tên gọi cho tiêu đề khi đăng bài. Để trống nếu bạn muốn xóa tên gọi khác")
    )

};