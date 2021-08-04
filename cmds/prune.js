import Num from "../args/num.js";
import ArgumentError from "../errors.js";

export default class PruneCommand {
    constructor(bot, msg, args) {
        if (args.length !== 1)
            throw new ArgumentError(this.constructor.arguments(), args.length);
        if (args[0] > 100) {
            msg.channel.send("That's WAY too many messages!");
            return;
        }

        msg.channel.fetch().then(channel => channel.messages.fetch({ limit: args[0]+1 }).then(messages => messages.forEach(function(msgg) {
            console.log(msgg.content);
            msgg.delete();
        })));
        msg.channel.send(args[0] +" messages deleted.").then(msg => msg.delete({timeout: 5000}));
    }

    static arguments() {
        return [Num];
    }

    static help() {
        return "Deletes *n* number of messages from the current channel.";
    }
}