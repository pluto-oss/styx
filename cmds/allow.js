import Role from "../args/role.js";
import Text from "../args/text.js";
import ArgumentError from "../errors.js";

export default class PermissionCommand {
	constructor(bot, msg, args) {
		if (args.length !== 2) 
			throw new ArgumentError(this.constructor.arguments(), args.length);

		let add = args[1].charAt(0);
		let perm = args[1].slice(1);
		if (add === "+") {
			bot.db.query("INSERT INTO role_permissions (role, permission) VALUES (?, ?)", [args[0].id, perm], (err) => {
				if (err) {
					msg.channel.send("Errored in mysql callback.");
					console.error(err);
				}
				else {
					msg.channel.send(`Set \`${args[0].name}\` to ${args[1]}`);
				}
			});
		}
		else if (add === "-") {
			bot.db.query("DELETE FROM role_permissions WHERE role = ? AND permission = ?", [args[0].id, perm], (err) => {
				if (err) {
					console.error(err);
					msg.channel.send("Errored in mysql callback.");
				}
				else {
					msg.channel.send(`Set \`${args[0].name}\` to ${args[1]}`);
				}
			});
		}
		else {
			msg.channel.send(`Please prefix your permission with + to add or - to remove`);
		}
	}

	static arguments() {
		return [Role, Text];
	}

	static help() {
		return "Gives or denies permissions to a specified command to a group.";
	}
};