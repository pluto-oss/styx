module.exports.Command = class PopulateCommand {
    constructor(bot, msg) {
        bot.db.query("SELECT ping FROM role_pings WHERE ping = 'early_joiners';", async(err, ret) => {
            if (err) {
                console.log("that error");
                throw err;
            }
          
            let last = ret[0].last
            let now = new Date()
            let last_split = last.split(/[- :]/)
            let last_date = new Date(Date.UTC(last_split[0], last_split[1] - 1, last_split[2], last_split[3], last_split[4], last_split[5]))
            last_date.setTime(this.getTime() + (20 * 60 * 60 * 1000))
            if (last_date <= now) {
                msg.channel.send("Hey <@&846572582702546984>, feel free to join the server if you're available.");
                console.log("no error running");
                bot.db.query("INSERT INTO role_pings (ping, last) VALUES ('early_joiners', NOW()) ON DUPLICATE KEY UPDATE last = NOW();");
                console.log("finished with no error");
            } else {
                msg.channel.send("The last role ping was too recent. Try again later.");
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
