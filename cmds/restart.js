export default class RollCommand {
    constructor(bot,msg) {
		msg.reply("Restarting...").then(() => {process.exit(0);});
    }

    static arguments() {
        return [];
    }

    static help() {
        return "restarts the bot";
    }
}