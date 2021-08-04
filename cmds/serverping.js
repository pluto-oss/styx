import Updater from "../libs/servers/index.js";

export default class JSCommand {
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
