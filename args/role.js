module.exports.Role = class Role {
	constructor(bot, text, ind, msg) {
		let regex = /<@&([0-9]+)>/g;
		regex.lastIndex = ind;
		let match = regex.exec(text);
		if (!match) {
			regex = /([0-9]+)/g;
			regex.lastIndex = ind;
			match = regex.exec(text);
		}
		if (match && msg.guild.roles.cache.has(match[1])) {
			this.data = msg.guild.roles.cache.get(match[1]);
			this.length = match[0].length;
		}
		else {
			let role_data = bot.acquireArgument(text, ind);
			if (!role_data)
				return;
			
			let possible = [];
			for (let role of msg.guild.roles.array()) {
				if (role.name.toLowerCase().indexOf(role_data[0].toLowerCase()) !== -1) {
					possible.push(role);
				}
			}

			if (possible.length === 1) {
				this.data = possible[0];
				this.length = role_data[1] - ind;
			}
		}
	}
}