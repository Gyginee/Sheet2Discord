const schedule = require('../scheduling/schedule');


module.exports = (client) => {
    schedule(client);
    return client.logger.info(`[DISCORD] ${client.user.tag} has logged in!`);
}