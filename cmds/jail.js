import User from "../args/user.js";
import Text from "../args/text.js";
import ArgumentError from "../errors.js";

export default class JailCommand {
	constructor(bot, msg, args) {
		if (args.length !== 2) 
			throw new ArgumentError(this.constructor.arguments(), args.length);

		if (!bot.jail) {
			msg.channel.send("This bot doesn't have a jail role set.");
		}

		if (!msg.guild.members.cache.has(args[0])) {
			msg.channel.send("This server doesn't have that user.");
			return;
		}

		let user = msg.guild.members.cache.get(args[0]);

		if (user.roles.cache.has(bot.jail)) {
			user.roles.remove(bot.jail, `${args[1]} - ${msg.author.displayName} (${msg.author.id})`).then(() => {
				msg.channel.send(`${user} was unjailed`);
			}).catch(() => {
				msg.channel.send(`${user} couldn't be unjailed.`);
			});
		}
		else {
			user.roles.add(bot.jail, `${args[1]} - ${msg.author.displayName} (${msg.author.id})`).then(() => {
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