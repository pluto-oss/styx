const {Num} = require("../args/num");
const {User} = require("../args/user");
const {ArgumentError} = require("../errors");

module.exports.Command = class PruneCommand {
    constructor(bot, msg, args) {
        if (args.length !== 1)
            throw new ArgumentError(this.constructor.arguments(), args.length);
        if (args[0] > 100) {
            msg.channel.send("That's WAY too many messages!");
            return;
        }

        msg.channel.fetchMessages({ limit: args[0]+1 }).then(messages => messages.forEach(function(msgg) {
            console.log(msgg.content);
            msgg.delete();
        }));
        msg.channel.send(args[0] +" messages deleted.").then(msg => msg.delete(5000));
    }

    static arguments() {
        return [Num];
    }

    static help() {
        return "Deletes *n* number of messages from the current channel.";
    }
}