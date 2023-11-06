const {
    SlashCommandSubcommandBuilder,
} = require("discord.js");

const database = require("../../database/sheetsToDiscordLinks");
exports.run = async (client, interaction) => {
    const uuid = interaction.options.getString("uuid");
    const groupName = interaction.options.getString('group-name');

    const headingName = interaction.options.getString("heading");



    await interaction.deferReply();

    const res = await database.findOne({ uuid });
    if (!res) {
        return interaction.editReply({ content: 'Không có liên kết nào có UUID mà bạn cung cấp!' })
    };

    
    const existingHeaderSetting = res.headingsSettings.get(headingName);

    if (!existingHeaderSetting && Boolean(groupName)) {
        res.headingsSettings.set(headingName, {
            group: groupName,
            title: headingName
        })
        await res.save();
    } else if (existingHeaderSetting) {
        existingHeaderSetting.group = groupName || undefined;
        await res.save();
    }

    return interaction.editReply({ content: `Cài đặt liên kết được thay đổi thành công!` });

}

exports.info = {
    name: "group",
    slash: new SlashCommandSubcommandBuilder()
        .setName("group")
        .setDescription(
            "Gộp 1 số tiêu đề cụ thể thành một mục chung khi đăng bài từ Google Sheet"
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
            .setName("group-name")
            .setDescription("Tên mục chung được gộp chung vào. Để trống nếu bạn muốn xóa tiêu đề khỏi group")
    )

};