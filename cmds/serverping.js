import Updater from "../libs/servers.js";

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
        return "Creates a new server updater message";
    }
}
