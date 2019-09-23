const {Text} = require("../args/text");
const {User} = require("../args/user");
const {ArgumentError} = require("../errors");

module.exports.Command = class TestCommand {
	constructor(bot, msg, args) {
		if (args.length !== 2) 
			throw new ArgumentError(this.constructor.arguments(), args.length);

		msg.channel.send(`player: <@${args[0].data}> rest: \`${args[1].data}\``);
	}

	static arguments() {
		return [User, Text];
	}
};