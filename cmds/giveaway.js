const {ID} = require("@node-steam/id");
const {MessageEmbed} = require("discord.js");

module.exports.Command = class GiveawayCommand {
	wait(length_ms) {
		return new Promise(res => {
			setTimeout(res, length_ms);
		});
	}
	roll(tickets) {
		let max_tickets = 0;
		for (let ply in tickets) {
			max_tickets += tickets[ply];
		}

		let ticket_chosen = Math.ceil(Math.random() * max_tickets);
		let ticket = ticket_chosen;

		for (let ply in tickets) {
			ticket_chosen -= tickets[ply];
			if (ticket_chosen <= 0) {
				return [ply, ticket];
			}
		}
	}
	async run(bot, msg, args) {
		let entered = [
			`STEAM_0:0:51532148`,
			`STEAM_0:1:41421619`,
			`STEAM_0:0:53899059`,
			`STEAM_0:1:99159671`,
			`STEAM_0:1:170887567`,
			`STEAM_0:0:193567796`,
			`STEAM_0:0:182493506`,
			`STEAM_0:1:21212157`,
			`STEAM_0:1:110260122`,
			`STEAM_0:1:43642229`,
			`STEAM_0:1:160982481`,
			`STEAM_0:0:431080684`,
			`STEAM_0:1:229178511`,
			`STEAM_0:1:160071695`,
			`STEAM_0:0:119244900`,
			`STEAM_0:0:197112600`,
			`STEAM_0:0:91804322`,
			`STEAM_0:0:454309681`,
			`STEAM_0:0:160185749`,
			`STEAM_0:0:498129162`,
			`STEAM_0:0:157234324`,
			`STEAM_0:0:62489627`,
			`STEAM_0:0:419905624`,
			`STEAM_0:0:100074644`,
			`STEAM_0:1:41818825`,
			`STEAM_0:1:52281932`,
			`STEAM_0:1:63007893`,
			`STEAM_0:1:49831499`,
			`STEAM_0:0:52248149`,
			`STEAM_0:1:53661328`,
			`STEAM_0:1:466374633`,
			`STEAM_0:1:244774784`,
			`STEAM_0:1:100340669`,
			`STEAM_0:1:100340669`,
			`STEAM_0:1:114434585`,
			`STEAM_0:0:449910003`,
			`STEAM_0:1:215885137`,
			`STEAM_0:1:101199615`,
			`STEAM_1:0:196528957`,
			`STEAM_0:1:200257459`,
			`STEAM_0:1:454389203`,
			`STEAM_0:1:47751769`,
			`STEAM_0:1:50277880`,
			`STEAM_0:0:74181378`,
			`STEAM_0:0:460655817`,
			`STEAM_0:1:218115222`,
			`STEAM_0:1:159324250`,
			`STEAM_0:1:74017745`, // lime got rest
			`STEAM_0:0:28467572`,
			`STEAM_0:1:24643024`,
			`STEAM_0:0:5312090`,
			`STEAM_0:0:27313934`,
		]
		let tickets = Object.create(null);
		let rewards = [ 
			`https://i.imgur.com/fzlkoyA.png Tomed coined Tec9`,
			`https://i.imgur.com/KRABTdt.png Otherworldly SG552`,
			`https://i.imgur.com/Bk5K391.png 6 mod Crafted Mac10`,
			`https://i.imgur.com/mkHLMzf.png Coined AK47`,
			`https://i.imgur.com/SWR6Sdt.png Crafted Famas`,
			`https://i.imgur.com/WUP8V4t.png "Oi cunt" 7 mod Deagle`,
			`https://i.imgur.com/mnqkfpk.png Dart Pistol`,
			`https://i.imgur.com/2GrXa3L.png Snowball Launcher`,
			`https://i.imgur.com/x8efCK0.png Dragons Breath`,
			`https://i.imgur.com/CDSqRJy.png Zero Suit Samus`,
			`https://i.imgur.com/6XEG6Fa.png Mystical M4A1`,
			`https://i.imgur.com/Ri6qv5o.png Rainbow Lightsaber`,
			`https://i.imgur.com/cqRn5Cj.png Tomahawk`,
			`https://i.imgur.com/sxjh5i4.png Crafted Rifle`,
			`https://i.imgur.com/Iqy2f6b.png Crafted Steyr Aug`,
			`https://i.imgur.com/fDUPeE3.png Tomed Pistol`,
			`https://i.imgur.com/YKgYhGR.png Crafted SG552`,
			`https://i.imgur.com/frucDDf.png Dropletted R301`,
			`https://i.imgur.com/izPKmBW.png Low Poly Model`,
			`https://i.imgur.com/ALQzlYY.png Blue Lightsaber`,
			`200 Tomes`,
			`13 Hearts`,
			`2 Quills`,
			`5700 Droplets`,
			`133 2020 Presents`,
			`50 end round crates`,
			`19 Refined Plutonium`,
			`1200 Stardust`,
		];
		let name_lookup = Object.create(null);

		let max_tickets = 0;
		for (let id of entered) {
			let id64 = (new ID(id.toUpperCase())).getSteamID64();
			let data = await (new Promise(res => {
				bot.db.query("SELECT time_played, displayname FROM pluto.pluto_player_info WHERE steamid = ? LIMIT 1", [id64], (err, ret) => {
					if (err || !ret[0]) {
						res(null);
						return;
					}

					res({
						tickets: Math.ceil(Math.min(50, ret[0].time_played / 60 / 60)),
						name: ret[0].displayname
					});
				});
			}));

			if (!data) {
				msg.channel.send(`could not get ${id64} data`);
			}
			else {
				tickets[id64] = data.tickets
				name_lookup[id64] = data.name;
				max_tickets += data.tickets;
			}
		}
		msg.channel.send(`got all data... starting giveaway!!! :partying_face: ${entered.length} poeple entered with ${max_tickets} tickets total...`);

		for (let reward of rewards) {
			msg.channel.send(`rolling reward for ${reward} in 20 seconds...`);
			await this.wait(15000);
			msg.channel.send("And the winner is....");
			await this.wait(5000);
			let [ply, ticket] = this.roll(tickets);
			msg.channel.send(`With ticket #${ticket}...`, new MessageEmbed({
				author: {
					name: name_lookup[ply],
					url: `https://steamcommunity.com/profiles/${ply}`,
				}
			}));
			await this.wait(40000);
		}
	}

	constructor(bot, msg, args) {
		this.run(bot, msg, args);
	}

	static arguments() {
		return [];
	}

	static help() {
		return "giveaway";
	}
};