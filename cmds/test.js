import Text from "../args/text.js";
import Role from "../args/role.js";
import ArgumentError from "../errors.js";

export default class TestCommand {
	constructor(bot, msg, args) {
		if (args.length !== 2) 
			throw new ArgumentError(this.constructor.arguments(), args.length);

		msg.channel.send(`role: ${args[0].name} rest: \`${args[1]}\``);
	}

	static arguments() {
		return [Role, Text];
	}
};