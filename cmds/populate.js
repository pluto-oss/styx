export default class PopulateCommand {
    constructor(bot, msg) {
        let min_time = 20 * 60 * 60

        bot.db.query("SELECT TIMESTAMPDIFF(SECOND, last, CURRENT_TIMESTAMP) as ago, ping FROM role_pings WHERE ping = 'early_joiners'", async(err, ret) => {
            if (err) {
                throw err;
            }

            if (ret[0].ago >= min_time) {
                let ping_channel = await bot.client.channels.fetch("846886760386658305");
                ping_channel.send("Hey <@&846572582702546984>, we're filling up the server! Join us at va1.pluto.gg")
                bot.db.query("INSERT INTO role_pings (ping, last) VALUES ('early_joiners', NOW()) ON DUPLICATE KEY UPDATE last = NOW();");
            } else {
                msg.channel.send("The last role ping was too recent. Try again in " + (min_time - ret[0].ago) + " seconds.");
            }
        });
    }

    static arguments() {
        return [];
    }

    static help() {
        return "Calls on the Early Joiners to populate the server.";
    }
}
