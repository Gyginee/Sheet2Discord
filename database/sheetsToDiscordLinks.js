const mongoose = require("mongoose");

const reqString = {
    type: String,
    required: true,
};
const reqNumber = {
    type: Number,
    required: true,
};
const previousDataSchema = new mongoose.Schema({
    messageId: String,
    data: Array,
    uuid: String,
    rowIndex: Number,
    initializedRow: Boolean
});

const heading = new mongoose.Schema({
    title: reqString,
    group: String,
    shown: String,
    announceWhenUpdate: Boolean,
    titlePriority: Boolean,
    displayName: String
});

const Schema = new mongoose.Schema({
    postExisting: {
        type: Boolean,
        default: false
    },
    headingsSettings: {
        type: Map,
        of: heading,
        default: new Map()
    },
    channelId: reqString,
    spreadsheetId: reqString,
    sheetId: reqString,
    guildId: reqString,
    startingFetchRowNumber: reqNumber,
    scheduleHour: {
        type: Number,
        default: 12
    },
    amPm: {
        type: String,
        default: 'pm'
    },
    uuid: reqString,
    previousData: {
        type: [previousDataSchema],
        default: []
    },
    limitPerDay: {
        type: Number,
        default: 5
    }
});

module.exports = mongoose.model("sheetsToDiscordLinks", Schema, "sheetsToDiscordLinks");
