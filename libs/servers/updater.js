const {FakeClient} = require("../a2s/client");
const {MessageEmbed} = require("discord.js");

const clients = [
	"va1.pluto.gg",
	"va2.pluto.gg",
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
				if (info.players >= 8) {
					this.bot.db.query("SELECT ping FROM role_pings WHERE ping = 'late_joiners';", async(err, ret) => {
					    if (err) {
						    console.log("this error");
						    throw err;
					    }

					    let last = ret[0].last
					    let now = new Date()
					    let last_split = last.split(/[- :]/)
					    let last_date = new Date(Date.UTC(last_split[0], last_split[1] - 1, last_split[2], last_split[3], last_split[4], last_split[5]))
					    last_date.setTime(this.getTime() + (20 * 60 * 60 * 1000))
					    if (last_date <= now) {
						let ping_channel = await this.bot.client.channels.fetch("846886760386658305");
						ping_channel.send("Hey <@&846572582702546984>, feel free to join the server if you're available.");
						this.bot.db.query("INSERT INTO role_pings (ping, last) VALUES ('late_joiners', NOW()) ON DUPLICATE KEY UPDATE last = NOW();");
					    }
					});
				}
				// End hijack

				return `💡 | ${info.players} / ${info.maxPlayers} | [${info.serverName}](https://pluto.gg/connect/${data.address}) | 🗺️ ${info.mapName}`
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
