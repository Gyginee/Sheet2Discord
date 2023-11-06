const {
    SlashCommandSubcommandBuilder,
    ChannelType
} = require("discord.js");

const database = require("../../database/sheetsToDiscordLinks");

exports.run = async (client, interaction) => {
    await interaction.deferReply();

    const channel = interaction.options.getChannel("channel");
    const uuid = interaction.options.getString("uuid");

    const res = await database.findOneAndUpdate(
        {
            uuid,
        },
        {
            channelId: channel.id
        }
    );

    if (!res) {
        return interaction.editReply({ content: 'Không có liên kết nào có UUID mà bạn cung cấp, vì vậy không có liên kết nào bị thay đổi.' })
    } else {
        return interaction.editReply({ content: `Cài đặt liên kết được thay đổi thành công!` })
    }
};

exports.info = {
    name: "set-channel",
    slash: new SlashCommandSubcommandBuilder()
        .setName("set-channel")
        .setDescription(
            "Đổi kênh đích của một liên kết Google Sheet và Discord"
        )
        .addStringOption((option) =>
            option
                .setName("uuid")
                .setDescription(
                    "UUID của liên kết bạn muốn thay đổi cài đặt. Tất cả liên kết: /link list"
                )
                .setRequired(true)
        )
        .addChannelOption((option) =>
            option
                .setName("channel")
                .setDescription("Kênh đích để gửi dữ liệu từ Google Sheet.")
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildForum)
        ),
};
