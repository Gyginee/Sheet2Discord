const { ComponentType } = require("discord.js");

module.exports = class Util {
    static fetchSubCommand(interaction) {
        try {
            const subCommandGroupName =
                interaction.options.getSubcommandGroup();
            const subCommandName = interaction.options.getSubcommand();
            return { subCommandGroupName, subCommandName };
        } catch {
            return null;
        }
    }
    static async deleteIfNotAvaliable(sheet) {}
    static epoch = 1680282000;
    static convertTo24HourFormat(hour, ampm) {
        if (ampm.toLowerCase() === "pm") {
            hour = (hour % 12) + 12;
        }
        return hour;
    }
    static async confirmationButton(
        interaction,
        msg,
        row,
        filter,
        originalMsgObj,
        { time = 60000 } = {}
    ) {
        return new Promise(async (resolve, reject) => {
            let endValue;
            let response;
            const collector = msg.createMessageComponentCollector({
                componentType: ComponentType.Button,
                filter,
                time,
            });

            collector.on("collect", async (res) => {
                endValue = Boolean(res.customId === "continuebtn");
                response = res;
                collector.stop();
            });
            collector.on("end", async (collected, reason) => {
                if (!endValue) {
                    row.components.forEach((button) =>
                        button.setDisabled(true)
                    );
                    if (!collected.size) {
                        interaction.editReply({
                            components: [row],
                            ...originalMsgObj,
                        });
                    } else {
                        collected.first().update({
                            components: [row],
                            ...originalMsgObj,
                        });
                    }
                }
                resolve({ endValue, res: response });
            });
        });
    }
};
