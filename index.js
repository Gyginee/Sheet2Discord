require('dotenv').config();
const mongo = require('./handler/MongoConnect');
const fs = require("fs");
const Heatsync = require("heatsync");

if (!fs.existsSync("logs")) fs.mkdirSync("logs");

if (!fs.existsSync("logs/output")) fs.mkdirSync("logs/output");
if (!fs.existsSync("logs/error")) fs.mkdirSync("logs/error");

const { GatewayIntentBits, Sweepers } = require('discord.js');
const Client = require('./structures/Client');


const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
    sweepers: {
        messages: {
            interval: 300,
            filter: Sweepers.filterByLifetime({
                lifetime: 900,
                getComparisonTimestamp: (e) =>
                    Boolean(e.editedTimestamp) ? e.editedTimestamp : e.createdTimestamp,
            }),
        },
    }
});
process.on("unhandledRejection", (error) => {
    client.logger.error(error);
});

const sync = new Heatsync();
sync.events.on("error", client.logger.error);
sync.events.on("any", (file) => client.logger.info(`${file} was changed`));

client.on("warn", (warn) => client.logger.log("warn", warn));
client.on("error", (err) => client.logger.log("error", err));

require('./handler/Event')(client);

(async() => {
    await require('./handler/Commands')(client, sync);
    await mongo.init(client);
    client.login(process.env.TOKEN).catch((err) => client.logger.log("error", err));
})()