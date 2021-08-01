const {FakeClient} = require("../a2s/client");
const {MessageEmbed} = require("discord.js");

const clients = [
	"va1.pluto.gg"
];

module.exports.Updater = class Updater {
	constructor(bot, msg) {
		this.bot = bot;
		this.msg = msg;
		this.run();
	}

	async run() {
		if (!this.clients) {
			// make new clients
			
			this.clients = [];

			for (let address of clients) {
				let cl;
				try {
					cl = await FakeClient.fromAddress(address, 27015, 3000);
				}
				catch (e) {
					console.error(e);
				}

				this.clients.push({
					client: cl,
					address
				});
			}
		}


		let waiting = this.clients.length;

		let statuses = [];

		let finish = async () => {
			if (--waiting !== 0) {
				return;
			}

			let embed = new MessageEmbed({
				timestamp: new Date(),
				title: "Server statuses",
			});

			statuses.sort((a, b) => {
				return a.address > b.address ? 1 : -1
			});

			this.bot.serverData = statuses;

			embed.description = statuses.map(data => {
				if (!data.info) {
					return `💀 ${data.address}`;
				}

				let info = data.info;
				
				// Hijacking for Late Joiners automated ping
				let min_time = 16 * 60 * 60
				let min_players = 8

				const rounds = [
					"blackmarket",
					"boom",
					"hitlist",
					"hotshot",
					"infection",
					"kingofthequill",
					"phantom",
					"trifight",
				];

				if (info.players >= min_players) {
					this.bot.db.query("SELECT TIMESTAMPDIFF(SECOND, last, CURRENT_TIMESTAMP) as ago, ping FROM role_pings WHERE ping = 'late_joiners'", async(err, ret) => {
					    if (err) {
						    throw err;
					    }

						if (ret[0].ago >= min_time) {
							let ping_channel = await this.bot.client.channels.fetch("846886760386658305");
							ping_channel.send("Hey <@&846572762575536138>, we've hit " + min_players + " players on the server! In five minutes, a random round will be queued!")
							this.bot.db.query("INSERT INTO role_pings (ping, last) VALUES ('late_joiners', NOW()) ON DUPLICATE KEY UPDATE last = NOW();");

							let ind = data.address.indexOf(".pluto.gg") // bad method?
							let serv = "unknown"

							if (ind >= 1) {
								serv = data.address.slice(0, ind)
							}

							let randomround = rounds[Math.floor(Math.random() * rounds.length)]

							this.bot.db.query("INSERT INTO pluto.pluto_round_queue (server, time, name, requester) VALUES (?, NOW() + INTERVAL 5 MINUTE, ?, ?);", [serv, randomround, 0]);
						}
					});
				}
				// End hijack

				return `💡 | ${info.players} / ${info.maxPlayers} | [${info.serverName}](steam://connect/${data.address}) | 🗺️ ${info.mapName}`
			}).join("\n");

			try {
				await this.msg.edit("", embed);
			}
			catch (e) {
				// console.error(e);
			}

			if (!this.stop) {
				this.timeout = setTimeout(() => {
					this.run();
				}, 15000);
			}
		}

		for (let {client, address} of this.clients) {
			if (!client) {
				statuses.push({
					address
				});

				finish();
				continue;
			}

			client.getInfo().then(info => {
				statuses.push({
					address,
					info
				});

				finish();
			})
			.catch(e => {
				statuses.push({
					address
				});

				finish();
			});
		}
	}

	clear() {
		this.stop = true;
		clearTimeout(this.timeout);
	}
}
