const {Text} = require("../args/text");
const {Num} = require("../args/num");
const {ArgumentError} = require("../errors");

module.exports.Command = class StatusCommand {
    constructor(bot, msg, args) {
        if (args.length != 2) {
            //this shit broken
            msg.channel.send("Error, Need both a number and text.\n```Number Guide:\n0: Playing...\n1: Streaming...\n2: Listening to...\n3: Watching...```");
            return;
        }

        if (args[0] <= 3 && args[0] >= 0) {
            //do we want it to save if we go offline?
            bot.client.user.setPresence({ game: { name: args[1], type: args[0]}}).catch(console.error);
        } else {
            //throw new ArgumentError();
        }
    }

    static arguments() {
        return [Num, Text];
    }

    static help() {
        return "Sets the status of the bot.";
    }
}