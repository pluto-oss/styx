const {Text} = require("../args/text");
const {FakeClient} = require("../libs/a2s/client");
const util = require("util");

module.exports.Command = class JSCommand {
    constructor(bot, msg, args) {
		if (args.length !== 1) {
			msg.reply("Argument missing (server address)");
			return;
		}

		let address = args[0], port = 27015;

		if (address.indexOf(":") !== -1) {
			[address, port] = address.split(":");
		}

		FakeClient.fromAddress(address, port).then(async cl => {
			try {
				let info = await cl.getInfo(1000);

				msg.reply("Got info: " + util.inspect(info));
			}
			catch (e) {
				msg.reply(`error in info get!: ${e.message}\n${e.stack}`);
			}
		})
		.catch(e => {
			msg.reply(`error!: ${e.message}\n${e.stack}`);
		});
    }

    static arguments() {
        return [Text];
    }

    static help() {
        return "Pings an IP Address and port to get game information from it";
    }
}
