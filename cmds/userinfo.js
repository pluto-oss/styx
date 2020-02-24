const {Text} = require("../args/text");
const {User} = require("../args/user");
const {ArgumentError} = require("../errors");

const {ID} = require("@node-steam/id");

module.exports.Command = class UserInfoCommand {
	constructor(bot, msg, args) {
		if (args.length !== 1) 
			throw new ArgumentError(this.constructor.arguments(), args.length);

		let id = args[0];

		let query = `SELECT CAST(discordid as CHAR) as discordid, CAST(I.steamid as CHAR)  as steamid, UNIX_TIMESTAMP(first_boost) as first_boost from styx.nitro N \
			left outer join forums.discord_users D on N.discordid = D.snowflake \
			left outer join forums.core_members C on C.member_id = D.forum_id
			left outer join pluto.pluto_player_info I on I.steamid = C.steamid`;

		let queryargs = [];
		if (id.toLowerCase().indexOf("steam_") === 0) {
			let id = new ID(id.toUpperCase());
			query += ` where I.steamid = ?`;
			queryargs = [id.getSteamID64()];
		}
		else {
			try {
				let user = new User(bot, id, 0, msg);
				query += ` where D.snowflake = ?`;
				queryargs = [user.id];
			}
			catch (e) {
				msg.reply("Couldn't find a user with argument.");
				return;
			}
		}


		bot.db.query(query, queryargs, (err, res) => {
			if (err) {
				msg.reply(`ERROR: ${err}`);
				return;
			}

			msg.reply(res.discordid);
		});
	}

	static arguments() {
		return [Text];
	}

    static help() {
        return "Provides user information links to an account.";
    }
};