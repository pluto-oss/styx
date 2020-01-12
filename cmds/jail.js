const {User} = require("../args/user");
const {Text} = require("../args/text");
const {ArgumentError} = require("../errors");

module.exports.Command = class JailCommand {
	constructor(bot, msg, args) {
		if (args.length !== 2) 
			throw new ArgumentError(this.constructor.arguments(), args.length);

		if (!bot.jail) {
			msg.channel.send("This bot doesn't have a jail role set.");
		}

		if (!msg.guild.members.has(args[0])) {
			msg.channel.send("This server doesn't have that user.");
			return;
		}

		let user = msg.guild.members.get(args[0]);

		if (user.roles.has(bot.jail)) {
			user.removeRole(bot.jail, `${args[1]} - ${msg.author.displayName} (${msg.author.id})`).then(() => {
				msg.channel.send(`${user} was unjailed`);
			}).catch(() => {
				msg.channel.send(`${user} couldn't be unjailed.`);
			});
		}
		else {
			user.addRole(bot.jail, `${args[1]} - ${msg.author.displayName} (${msg.author.id})`).then(() => {
				msg.channel.send(`${user} was jailed`);
				user.send(`You were jailed on ${msg.guild.name} by ${msg.author} with the reason "${args[1]}".`);
			}).catch((e) => {
				msg.channel.send(`${user} couldn't be jailed.`);
				console.error(e);
			});
		}
	}

	static arguments() {
		return [User, Text];
	}

	static help() {
		return "Gives/removes the Jail role on a player.";
	}
};