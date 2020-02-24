module.exports.Command = class RollCommand {
    constructor(bot,msg) {
		await msg.reply("Restarting...");
		process.exit(0);
    }

    static arguments() {
        return [];
    }

    static help() {
        return "restarts the bot";
    }
}