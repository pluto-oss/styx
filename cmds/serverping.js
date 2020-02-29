const {Text} = require("../args/text");
const {Updater} = require("../libs/servers/updater");
const util = require("util");

module.exports.Command = class JSCommand {
    constructor(bot, msg, args) {
		msg.reply("starting").then(newmsg => {
			new Updater(newmsg);
		});
    }

    static arguments() {
        return [];
    }

    static help() {
        return "Starts the updater";
    }
}
