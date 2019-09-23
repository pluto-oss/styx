const {MessageMentions} = require("discord.js");

module.exports.User = class User {
	constructor(bot, text, ind) {
		console.log(text);
		let regex = /<@!?([0-9]+)>/g;
		regex.lastIndex = ind;
		let match = regex.exec(text);
		console.log(match);
		console.log(regex);
		if (!match) {
			regex = /([0-9]+)/g;
			regex.lastIndex = ind;
			match = regex.exec(text);
		}

		if (match) {
			this.length = match[0].length;
			this.data = match[1];
			this.valid = bot.users.has(this.data);
		}
	}
}