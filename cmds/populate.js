module.exports.Command = class PopulateCommand {
    constructor(bot, msg) {
        bot.db.query("SELECT ping FROM role_pings WHERE ping = 'early_joiners';", async(err, ret) => {
            if (err) throw err;
          
            let last = ret[0].last
            // let now = // current time
            // if now - last is greater than 20 hours then
                msg.channel.send("Hey <@&846572582702546984>, feel free to join the server if you're available.");
                bot.db.query("INSERT INTO pings (ping, last) VALUES ('early_joiners', NOW()) ON DUPLICATE KEY SET last = VALUE(last);
            // else
                msg.channel.send("The last role ping was too recent. Try again later.");
        });
    }

    static arguments() {
        return [];
    }

    static help() {
        return "Calls on the Early Joiners to populate the server.";
    }
}
