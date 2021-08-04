import Text from "../args/text.js";

export default class JSCommand {
    constructor(bot, msg, args) {
        let fn = new Function("bot", "msg", args[0]);

		if (!fn) {
			msg.reply("Couldn't create function");
			return;
		}

		try {
			let res = fn(bot, msg);

			if (res) {
				msg.reply("result: " + res.toString());
			}
			else {
				msg.reply("success");
			}
		}
		catch (e) {
			msg.reply("error: " + e.toString() + "\n" + e.stack);
		}
    }

    static arguments() {
        return [Text];
    }

    static help() {
        return "If you don't know what this command does already, you shouldn't use it.";
    }
}
