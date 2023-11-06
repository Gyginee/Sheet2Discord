const { SlashCommandSubcommandBuilder } = require("discord.js");
const database = require("../../database/sheetsToDiscordLinks");

exports.run = async (client, interaction) => {
    const uuid = interaction.options.getString("uuid");

    await interaction.deferReply();

    const res = await database.findOne({ uuid });
    if (!res) {
        return interaction.editReply({ content: 'Không có liên kết nào có UUID mà bạn cung cấp, vì vậy không có liên kết nào được chạy.' })
    } else {
        const job = client.scheduleManager.get(uuid);
        job.invoke();
        return interaction.editReply({ content: `Liên kết được chạy thành công!` })
    }
}


exports.info = {
    name: "run",
    slash: new SlashCommandSubcommandBuilder()
        .setName("run")
        .setDescription(
            "Chạy một liên kết trước hạn."
        )
        .addStringOption((option) =>
            option
                .setName("uuid")
                .setDescription("UUID của liên kết bạn muốn chạy. Tất cả liên kết: /link list")
                .setRequired(true)
        )
};