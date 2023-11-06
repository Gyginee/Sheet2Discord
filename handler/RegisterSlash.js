require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { SlashCommandBuilder, SlashCommandSubcommandGroupBuilder } = require('discord.js');
const { REST, Routes } = require('discord.js');

(async() => {
    if (!process.env.CLIENTID || !process.env.GUILDID) {
        console.log(`Mục CLIENTID và GUILDID trong file .env không được để trống!`);
        process.exit(1);
    }
    console.log(`Initilizing commands files and folders....`);
    const commands = [];
    const files = await fs.promises.readdir('./commands/');
    const individualCmd = files.filter(file => path.extname(file) === '.js');

    if (individualCmd.length) {
        console.log(`Found ${individualCmd.length} individual command(s).`);
        for (const cmd of individualCmd) {
            const command = require(`../commands/${cmd}`);
            commands.push(command.info.slash.toJSON());
        };
    };

    const categories = files.filter(file => !Boolean(path.extname(file)));

    if (categories.length) {
        console.log(`Found ${categories.length} folders.`);
        for (const directory of categories) {
            try {
                console.log(`Analyzing folder ${directory}`);
                const el = await fs.promises.readdir(`./commands/${directory}`);
                const categoryData = require(`../commands/${directory}/module.json`);
                const cmds = el.filter(file => path.extname(file) === '.js');
                const folders = el.filter(file => !Boolean(path.extname(file)));
                if (!cmds.length && !folders.length) continue;
                const slashCommand = new SlashCommandBuilder()
                    .setName(categoryData.name)
                    .setDescription(categoryData.description)
                if (cmds.length) {
                    console.log(`Found ${cmds.length} individual command(s) inside ${directory}`);
                    for (const cmd of cmds) {
                        const command = require(`../commands/${directory}/${cmd}`);
                        slashCommand.addSubcommand(command.info.slash);
                    };
                    commands.push(slashCommand.toJSON());
                } else {
                    console.log(`Found ${folders.length} folder(s) inside ${directory}`);
                    let subCommandsOfSubCommandGroup = 0;
                    for (const folder of folders) {
                        console.log(`Analyzing folder ${folder} inside ${directory}`);
                        const subCategoryData = require(`../commands/${directory}/${folder}/module.json`);
                        const data = await fs.promises.readdir(`./commands/${directory}/${folder}`);
                        const cmdFiles = data.filter(file => path.extname(file) === '.js');
                        subCommandsOfSubCommandGroup += cmdFiles.length;
                        console.log(`Found ${cmdFiles.length} individual command(s) inside folder ${folder} inside folder ${directory}`);
                        if (!cmdFiles.length) continue;
                        const slashCommandSubGroup = new SlashCommandSubcommandGroupBuilder()
                            .setName(subCategoryData.name)
                            .setDescription(subCategoryData.description)
                        for (const category of cmdFiles) {
                            const command = require(`../commands/${directory}/${folder}/${category}`);
                            slashCommandSubGroup.addSubcommand(command.info.slash);
                        };
                        slashCommand.addSubcommandGroup(slashCommandSubGroup);
                    }
                    console.log(`Added a total of ${subCommandsOfSubCommandGroup} inside sub command group ${categoryData.name}`);
                    if (subCommandsOfSubCommandGroup == 0) {
                        console.log(`Sub command group ${categoryData.name} wasn't added to command array as there are no command files in any folders.`);
                    } else {
                        commands.push(slashCommand.toJSON());
                    };
                }
            } catch (error) {
                console.error(error);
                continue;
            }
        };
    };
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);
        const data = await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENTID, process.env.GUILDID), { body: commands },
        );

        console.log(`Successfully reloaded ${data.length} application (/) commands.`);
    } catch (error) {
        console.error(error);
    }
})();