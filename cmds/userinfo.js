const {Text} = require("../args/text");
const {User} = require("../args/user");
const {ArgumentError} = require("../errors");

const {ID} = require("@node-steam/id");

module.exports.Command = class UserInfoCommand {
	constructor(bot, msg, args) {
		if (args.length !== 1) 
			throw new ArgumentError(this.constructor.arguments(), args.length);

		let id = args[0], query, how, queryargs = [];
		if (id.toLowerCase().indexOf("steam_") === 0) {
			let id = new ID(id.toUpperCase());

			query = `SELECT CAST(discordid as CHAR) as discordid, CAST(I.steamid as CHAR) as steamid, I.time_played as time_played FROM pluto.pluto_player_info I
				left outer join forums.core_members C on C.steamid = I.steamid
				left outer join forums.discord_users D on D.forum_id = C.member_id

				where I.steamid = ?`;

			queryargs = [id.getSteamID64()];
			how = `steamid ${id.getSteamID64()}`;
		}
		else {
			try {
				let user = new User(bot, id, 0, msg);
				query = `SELECT CAST(discordid as CHAR) as discordid, CAST(I.steamid as CHAR) as steamid, I.time_played as time_played FROM forums.discord_users D
					left outer join forums.core_members C on D.forum_id = C.member_id
					left outer join pluto.pluto_player_info I ON C.steamid = I.steamid
	
					where D.discordid = ?`;
				queryargs = [user.id];
				how = `discordid ${user.id}`;
			}
			catch (e) {
				msg.reply("Couldn't find a user with argument.");
				return;
			}
		}


		bot.db.query(`${query} LIMIT 1`, queryargs, (err, res) => {
			if (err) {
				msg.reply(`ERROR: ${err}`);
				return;
			}

			msg.reply(JSON.stringify(res));
		});
	}

	static arguments() {
		return [Text];
	}

    static help() {
        return "Provides user information links to an account.";
    }
};