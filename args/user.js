export default class User {
	constructor(bot, text, ind, msg) {
		let regex = /<@!?([0-9]+)>/g;
		regex.lastIndex = ind;
		let match = regex.exec(text);

		if (!match) {
			regex = /([0-9]+)/g;
			regex.lastIndex = ind;
			match = regex.exec(text);
		}

		if (match) {
			this.length = match[0].length;
			this.data = match[1];
		}
		if (!this.data || !msg.guild.members.cache.has(this.data)) {
			let name_data = bot.acquireArgument(text, ind);
			if (!name_data)
				return;

			name_data[0] = name_data[0].toLowerCase();

			let items = msg.guild.members.cache.array().filter(x => x.user.username.toLowerCase().indexOf(name_data[0]) !== -1 || x.displayName.toLowerCase().indexOf(name_data[0]) !== -1);

			if (items.length === 1) {
				this.data = items[0].id;
				this.length = name_data[1] - ind;
			}
		}
	}
}