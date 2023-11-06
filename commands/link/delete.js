const {
    SlashCommandSubcommandBuilder,
} = require("discord.js");

const database = require("../../database/sheetsToDiscordLinks");
exports.run = async (client, interaction) => {
    const uuid = interaction.options.getString("uuid");

    await interaction.deferReply();

    const res = await database.deleteOne({ uuid });
    if (res.deletedCount == 0) {
        return interaction.editReply({ content: 'Không có liên kết nào có UUID mà bạn cung cấp, vì vậy không có liên kết nào bị thay đổi.' })
    } else {
        const job = client.scheduleManager.get(uuid);
        job.cancel();
        return interaction.editReply({ content: `Liên kết được xóa thành công!` })
    }
}

exports.info = {
    name: "delete",
    slash: new SlashCommandSubcommandBuilder()
        .setName("delete")
        .setDescription(
            "Xóa một liên kết giữa Google Sheet và Discord"
        )
        .addStringOption((option) =>
            option
                .setName("uuid")
                .setDescription("UUID của liên kết muốn thay đổi cài đặt. Tất cả liên kết: /link list")
                .setRequired(true)
        )
};