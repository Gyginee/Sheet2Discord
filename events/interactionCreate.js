const { fetchSubCommand } = require("../handler/Util");

module.exports = async (client, interaction) => {
    if (interaction.isChatInputCommand() || interaction.isAutocomplete()) {
        const commandFile = client.commands.get(interaction.commandName);
        if (!commandFile && !interaction.isAutocomplete()) {
            return interaction.reply({
                content: `:grey_question: Hình như commmand đấy cũ rồi! Thông thường Discord sẽ mất 1 tiếng để các thay đổi về lệnh của tôi được thực thi (thêm hoặc bớt lệnh)`,
                ephemeral: true,
            });
        }
        const subOptions = fetchSubCommand(interaction);
        try {
            if (subOptions) {
                if (subOptions.subCommandName && subOptions.subCommandGroupName) {
                    const group = commandFile.subCommandsGroup.get(
                        subOptions.subCommandGroupName
                    );
                    const command = group.subCommands.get(
                        subOptions.subCommandName
                    );
                    if (interaction.isAutocomplete())
                        return command.autocomplete(client, interaction);
                    else {
                        client.logger.info(
                            `${interaction.user.tag} (${
                                interaction.user.id
                            }) from ${
                                interaction.inGuild()
                                    ? `${interaction.guild.name} (${interaction.guild.id})`
                                    : "DM"
                            } ran an application command: /${
                                interaction.commandName
                            } ${subOptions.subCommandGroupName} ${
                                subOptions.subCommandName
                            }`
                        );
                        return command.run(client, interaction);
                    }
                } else {
                    const command = commandFile.subCommandsGroup.get(
                        subOptions.subCommandName
                    );
                    if (interaction.isAutocomplete())
                        return command.autocomplete(client, interaction);
                    else {
                        client.logger.info(
                            `${interaction.user.tag} (${
                                interaction.user.id
                            }) from ${
                                interaction.inGuild()
                                    ? `${interaction.guild.name} (${interaction.guild.id})`
                                    : "DM"
                            } ran an application command: /${
                                interaction.commandName
                            } ${subOptions.subCommandName}`
                        );
                        return command.run(client, interaction);
                    }
                }
            } else {
                if (interaction.isAutocomplete())
                    return commandFile.autocomplete(client, interaction);
                else {
                    client.logger.info(
                        `${interaction.user.tag} (${interaction.user.id}) from ${
                            interaction.inGuild()
                                ? `${interaction.guild.name} (${interaction.guild.id})`
                                : "DM"
                        } ran an application command: /${interaction.commandName}`
                    );
                    return commandFile.run(client, interaction);
                }
            }
        } catch (error) {
            client.logger.error(error);
            return interaction.reply({
                content: `Đã có lỗi khi thực thi lệnh cho bạn. Vui lòng liên lạc với owner nhé!`,
                ephemeral: true,
            });

        }
    }
};
