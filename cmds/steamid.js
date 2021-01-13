const {Text} = require("../args/text");
const {ID} = require("@node-steam/id");

module.exports.Command = class SteamIDCommand {
    constructor(bot, msg, args) {
		try {
			let steamid = new ID(args[0]);

			let embed = {
				author: {
					name: steamid.getSteamID64(),
					url: `https://steamcommunity.com/profiles/${steamid.getSteamID64()}`
				},
				fields: [
					{
						name: "SteamID2",
						value: steamid.getSteamID2()
					},
					{
						name: "SteamID3",
						value: steamid.getSteamID3(),
						inline: true
					},
					{
						name: "SteamID64",
						value: steamid.getSteamID64()
					}
				]
			};

			msg.channel.send(embed);
		}
		catch (e) {
			msg.reply("Couldn't understand that steamid." + e.message + "\n" + e.stack);
		}
    }

    static arguments() {
        return [Text];
    }

    static help() {
        return "If you don't know what this command does already, you shouldn't use it.";
    }
}