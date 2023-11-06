const { SlashCommandSubcommandBuilder } = require("discord.js");
const database = require("../../database/sheetsToDiscordLinks");

exports.run = async (client, interaction) => {
    await interaction.deferReply();

    const number = interaction.options.getNumber("number");
    const uuid = interaction.options.getString("uuid");

    const res = await database.findOne({
        uuid,
    });

    if (!res) {
        return interaction.editReply({
            content:
                "Không có liên kết nào có UUID mà bạn cung cấp, vì vậy không có liên kết nào bị thay đổi.",
        });
    }

    res.startingFetchRowNumber = number;
    await res.save();
    return interaction.editReply({
        content: `Cài đặt liên kết được thay đổi thành công!`,
    });
};

exports.info = {
    name: "start-location",
    slash: new SlashCommandSubcommandBuilder()
        .setName("start-location")
        .setDescription(
            "Đặt vị trí bắt đầu của bảng mà bạn muốn theo dõi nếu hàng đầu là tiêu đề chung"
        )
        .addStringOption((option) =>
            option
                .setName("uuid")
                .setDescription(
                    "UUID của liên kết muốn thay đổi cài đặt. Tất cả liên kết: /link list"
                )
                .setRequired(true)
        )
        .addNumberOption((option) =>
            option
                .setName("number")
                .setDescription(
                    "Hàng này bắt buộc phải là hàng tiêu đề. Những hàng dưới sẽ là bài đăng được cập nhật"
                )
                .setMinValue(2)
                .setRequired(true)
        ),
};
