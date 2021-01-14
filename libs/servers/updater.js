const {FakeClient} = require("../a2s/client");
const {MessageEmbed} = require("discord.js");

const clients = [
	"va1.pluto.gg",
	"va2.pluto.gg",
];

module.exports.Updater = class Updater {
	constructor(msg) {
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

			embed.description = statuses.map(data => {
				if (!data.info) {
					return `💀 ${data.address}`;
				}

				let info = data.info;

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