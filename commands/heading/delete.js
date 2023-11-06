const {
    SlashCommandSubcommandBuilder,
} = require("discord.js");

const database = require("../../database/sheetsToDiscordLinks");
exports.run = async (client, interaction) => {
    const uuid = interaction.options.getString("uuid");
    const headingName = interaction.options.getString("heading");

    await interaction.deferReply();

    const res = await database.findOne({ uuid });
    if (!res) {
        return interaction.editReply({ content: 'Không có liên kết nào có UUID mà bạn cung cấp!' })
    };


    const exist = res.headingsSettings.delete(headingName);

    if (!exist) {
        return interaction.editReply({ content: 'Không có cài đặt nào được khôi phục thành mặc định vì bạn chưa cài đặt gì ở tiêu đề này cả!' })
    } else {
        await res.save()
        return interaction.editReply({ content: `Cài đặt của tiêu đề được xóa thành công!` })
    }
}


exports.info = {
    name: "delete",
    slash: new SlashCommandSubcommandBuilder()
        .setName("delete")
        .setDescription(
            "Xóa cài đặt của một tiêu đề khi đăng bài từ Google Sheet thành mặc định"
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
};