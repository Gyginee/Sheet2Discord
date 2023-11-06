const {
    SlashCommandSubcommandBuilder,
} = require("discord.js");


const database = require("../../database/sheetsToDiscordLinks");
exports.run = async (client, interaction) => {
    const uuid = interaction.options.getString("uuid");
    const enable = Boolean(interaction.options.getString('enable'));

    await interaction.deferReply();

    const res = await database.findOne({ uuid });
    if (!res) {
        return interaction.editReply({ content: 'Không có liên kết nào có UUID mà bạn cung cấp!' })
    };

    res.postExisting = enable

    await res.save()

    return interaction.editReply({ content: `Cài đặt liên kết được thay đổi thành công!` });
}


exports.info = {
    name: "post-existing",
    slash: new SlashCommandSubcommandBuilder()
        .setName("post-existing")
        .setDescription(
            "Cho phép đăng nhưng bài có sẵn trong Google Sheet thay vì là mục mới"
        )
        .addStringOption((option) =>
            option
                .setName("uuid")
                .setDescription("UUID của liên kết muốn thay đổi cài đặt. Tất cả liên kết: /link list")
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
            .setDescription("Chỉnh tắt hoặc bật đăng bài có sẵn")
            .setRequired(true)
    )
};