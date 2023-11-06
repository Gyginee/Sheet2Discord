const fs = require('fs');
const path = require('path');
const { Collection } = require("discord.js");

module.exports = async(client, sync) => {
    client.logger.info(`Initilizing commands files and folders....`);

    const files = await fs.promises.readdir('./commands/');
    const individualCmd = files.filter(file => path.extname(file) === '.js');

    if (individualCmd.length) {
        client.logger.info(`Found ${individualCmd.length} individual command(s).`);
        for (const cmd of individualCmd) {
            const command = sync.require(`../commands/${cmd}`);
            client.commands.set(command.info.name, command);
        };
    };
    
    const categories = files.filter(file => !Boolean(path.extname(file)));

    if (categories.length) {
        client.logger.info(`Found ${categories.length} folders.`);
        for (const directory of categories) {
            try {
                client.logger.info(`Analyzing folder ${directory}`);
                const el = await fs.promises.readdir(`./commands/${directory}`);
                const categoryData = require(`../commands/${directory}/module.json`);
                const cmds = el.filter(file => path.extname(file) === '.js');
                const folders = el.filter(file => !Boolean(path.extname(file)));
                if (!cmds.length && !folders.length) continue;
                client.commands.set(categoryData.name, {
                    subCommandsGroup: new Collection()
                });
                if (cmds.length) {
                    client.logger.info(`Found ${cmds.length} individual command(s) inside ${directory}`);
                    const res = client.commands.get(categoryData.name);
                    for (const cmd of cmds) {
                        const command = sync.require(`../commands/${directory}/${cmd}`)
                        res.subCommandsGroup.set(command.info.name, command)
                    }
                } else {
                    client.logger.info(`Found ${folders.length} folder(s) inside ${directory}`);
                    let subCommandsOfSubCommandGroup = 0;
                    for (const folder of folders) {
                        client.logger.info(`Analyzing folder ${folder} inside ${directory}`);
                        const subCategoryData = require(`../commands/${directory}/${folder}/module.json`);
                        const data = await fs.promises.readdir(`./commands/${directory}/${folder}`);
                        const cmdFiles = data.filter(file => path.extname(file) === '.js');
                        subCommandsOfSubCommandGroup += cmdFiles.length;
                        client.logger.info(`Found ${cmdFiles.length} individual command(s) inside folder ${folder} inside folder ${directory}`);
                        if (!cmdFiles.length) continue;
                        const res = client.commands.get(categoryData.name);
                        res.subCommandsGroup.set(subCategoryData.name, {
                            subCommands: new Collection()
                        });
                        const subs = res.subCommandsGroup.get(subCategoryData.name);
                        for (const category of cmdFiles) {
                            const command = sync.require(`../commands/${directory}/${folder}/${category}`);
                            subs.subCommands.set(command.info.name, command)
                        };
                    }
                    client.logger.info(`Added a total of ${subCommandsOfSubCommandGroup} inside sub command group ${categoryData.name}`);
                    if (subCommandsOfSubCommandGroup == 0) {
                        client.logger.info(`Deleting sub command group ${categoryData.name} from collection as there are no command files in any folders.`);
                        client.commands.delete(categoryData.name);
                    }
                }

            } catch (error) {
                client.logger.error(error);
                continue;
            }
        };
    }
}