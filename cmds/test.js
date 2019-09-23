const {Text} = require("../args/text");
const {User} = require("../args/user");
const {Role} = require("../args/role");
const {ArgumentError} = require("../errors");

module.exports.Command = class TestCommand {
	constructor(bot, msg, args) {
		if (args.length !== 2) 
			throw new ArgumentError(this.constructor.arguments(), args.length);

		msg.channel.send(`role: ${args[0].name} rest: \`${args[1]}\``);
	}

	static arguments() {
		return [Role, Text];
	}
};