const {Text} = require("../args/text");
const {User} = require("../args/user");
const {ArgumentError} = require("../errors");
const {inspect} = require("util");
const {MessageEmbed} = require("discord.js");

const {ID} = require("@node-steam/id");

const base = 15;
const linear = 22;
const expo = 0.2;

function level_to_exp(lvl) {
	lvl = lvl - 1
	return (base + linear * lvl + expo * lvl ^ 2) * 125
}

function exp_to_level(exp) {
	exp = (exp ? exp : 0) / 125 + 1
	return (-linear + Math.sqrt(linear ^ 2 - 4 * expo * (base - exp))) / (2 * expo) + 1
}


let timewords = Object.create(null);
let timewords_arr = [];
function registertimeword(word, abbrev, duration) {
	timewords[word] = duration
	timewords[word + "s"] = duration
	timewords[abbrev] = duration

	timewords_arr.push({
		Word: word,
		Abbrev: abbrev,
		Duration: duration
	})

	timewords_arr.sort((a, b) => b.Duration - a.Duration);
}

registertimeword("second", "s", 1);
registertimeword("minute", "m", 60);
registertimeword("hour",   "h", 60 * 60);
registertimeword("day",    "d", 60 * 60 * 24);
registertimeword("week",   "w", 60 * 60 * 24 * 7);
registertimeword("month",  "M", 60 * 60 * 24 * 28);

function nicetime(playtime) {
	let nicetime = [];

	for (data of timewords_arr) {
		if (playtime >= data.Duration) {
			let amount = Math.floor(playtime / data.Duration);
			playtime = playtime - amount * data.Duration;
			nicetime.push(amount + data.Abbrev);
		}
	}

	return nicetime.join(" ");
}

module.exports.Command = class UserInfoCommand {
	constructor(bot, msg, args) {
		if (args.length !== 1) 
			throw new ArgumentError(this.constructor.arguments(), args.length);

		let id = args[0], query, how, queryargs = [];
		let field_queries = "CAST(I.steamid as CHAR) as steamid, I.time_played, INET_NTOA(I.last_server) as last_server, I.displayname as steamname, I.last_join, I.tokens, I.experience, I.rank, C.member_id as forum_id, C.name as forumname, C.pp_main_photo";
		if (id.toLowerCase().indexOf("steam_") === 0 || id.indexOf("765") === 0) {
			let id = new ID(id.toUpperCase());

			query = `SELECT CAST(discordid as CHAR) as discordid, ${field_queries} FROM pluto.pluto_player_info I
				left outer join forums.core_members C on C.steamid = I.steamid
				left outer join forums.discord_users D on D.forum_id = C.member_id

				where I.steamid = ?`;

			queryargs = [id.getSteamID64()];
			how = `steamid`;
		}
		else {
			try {
				let user = new User(bot, id, 0, msg);
				query = `SELECT CAST(D.snowflake as CHAR) as discordid, ${field_queries} FROM forums.discord_users D
					left outer join forums.core_members C on D.forum_id = C.member_id
					left outer join pluto.pluto_player_info I ON C.steamid = I.steamid

					where D.snowflake = ?`;
				queryargs = [user.data];
				how = `discordid`;
			}
			catch (e) {
				console.log(e)
				msg.reply("Couldn't find a user with argument.");
				return;
			}
		}

		bot.db.query(`${query} LIMIT 1`, queryargs, async (err, res) => {
			if (err) {
				msg.reply(`ERROR: ${err}`);
				return;
			}
			res = res[0];

			if (!res) {
				msg.reply("Player not signed in through forums! Use https://pluto.gg/settings/discord/");
				return;
			}

			let avatar = `https://cdn.discordapp.com/avatars/${res.discordid}/${(await bot.client.users.fetch(res.discordid)).avatar}.png`;

			let embed = new MessageEmbed();
			embed.author = {
				name: res.steamname,
				url: `https://steamcommunity.com/profiles/${res.steamid}`,
				icon_url: avatar
			};

			embed.fields = [
				{
					name: "Level",
					value: Math.floor(exp_to_level(res.experience)),
					inline: true
				},
				{
					name: "Time Played",
					value: nicetime(res.time_played),
					inline: true
				},
				{
					name: "Rank",
					value: res.rank,
					inline: true
				},
			];

			embed.timestamp = Date.now();

			embed.footer = {
				text: `found by ${how}`
			};

			embed.thumbnail = {
				url: `https://pluto.gg/uploads/${res.pp_main_photo}`
			};

			embed.description = `[${res.forumname}](https://pluto.gg/profile/${res.forum_id}-a) - <@${res.discordid}>`;

			console.log(embed);

			msg.reply("", {embed});
		});
	}

	static arguments() {
		return [Text];
	}

    static help() {
        return "Provides user information links to an account.";
    }
};