const database = require("../database/sheetsToDiscordLinks");
const schedule = require("node-schedule");

const posting = require("./postingForum");


const { convertTo24HourFormat } = require('../handler/Util');

module.exports = async (client) => {
    const data = await database.find({});

    if (!data.length) return;

    client.logger.info(`Found ${data.length} bridge in database.`)

    for (const link of data) {
        const { scheduleHour, amPm, uuid } = link;
        const hour = convertTo24HourFormat(scheduleHour, amPm);
        
        const rule = new schedule.RecurrenceRule();
        rule.hour = hour;
        rule.minute = 0;
        rule.tz = "Asia/Ho_Chi_Minh";

        const job = schedule.scheduleJob(rule, function () {
            posting(client, uuid)
        });
        client.scheduleManager.set(uuid, job);

        client.logger.info(`${uuid} was rescheduled!`);
    }
};
