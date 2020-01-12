module.exports.Command = class RollCommand {
    constructor(bot,msg) {
        msg.reply("3");
    }

    static arguments() {
        return [];
    }

    static help() {
        return "rolls coin";
    }
}