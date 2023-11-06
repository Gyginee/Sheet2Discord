const mongoose = require('mongoose');
module.exports = {
    init: async(client) => {
        const dbOptions = {
            autoIndex: false,
            connectTimeoutMS: 10000,
            family: 4,
        };
        mongoose.Promise = global.Promise;
        mongoose.set('bufferCommands', false);
        mongoose.connection.on('connected', () => {
            client.logger.info('[MONGO] Mongoose has successfully connected!');
        });

        mongoose.connection.on('err', err => {
            client.logger.error(`[MONGO] Mongoose connection error: \n${err.stack}`);
        });

        mongoose.connection.on('disconnected', () => {
            client.logger.warn('[MONGO] Mongoose connection lost');
        });
        await mongoose.connect(process.env.MONGOURL, dbOptions).catch(() => {
            client.logger.error('[MONGO] Mongoose connect failed');
            process.exit(1);
        });
        return true;
    }
}