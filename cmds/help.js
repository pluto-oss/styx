import Text from "../args/text.js";

export default class HelpCommand {
    constructor(bot, msg, args) {
        let cmd = bot.commandList[args[0]];

        if (!cmd || !args[0]) {
            msg.channel.send("\""+args[0]+ "\" is not a valid command!");
            return;
        }

        if (cmd.help) {
            msg.channel.send(cmd.help());
        } else {
            msg.channel.send("That command doesn't have any help set up.");
        }
    }

    static arguments() {
        return [Text]
    }

    static help() {
        return "Gives info on a command."
    }
}