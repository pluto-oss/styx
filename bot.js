const {Client, MessageEmbed, DiscordAPIError, ReactionCollector} = require("discord.js");
const fs = require("fs");
const request = require("request");
const moment = require("moment");
const {Updater} = require("./libs/servers/updater")
const {DateTime, Duration, Interval} = require("luxon");
const config = require("./config");

const express = require("express");
const bdy = require("body-parser");
const basicAuth = require("express-basic-auth");
const e = require("express");

module.exports.Bot = class Bot {
	constructor(db) {
		this.db = db;
		this.client = new Client({
			disableMentions: 'everyone'
		});
		this.client.on("ready", this.onready.bind(this));
		this.client.on("message", this.onmessage.bind(this));
		this.client.on("guildMemberRemove", this.onmemberleave.bind(this));
		this.client.on("guildMemberAdd", this.onmemberjoin.bind(this));
		this.db.query("CREATE TABLE IF NOT EXISTS `styx_settings` (\
			setting varchar(20) not null,\
			value varchar(20) not null\
		);");
		this.db.query("CREATE TABLE IF NOT EXISTS `stored_messages` (\
			guild_id bigint unsigned not null, \
			channel_id bigint unsigned not null, \
			message_id bigint unsigned not null, \
			sender_id bigint unsigned not null, \
			text varchar(2000) not null, \
			time TIMESTAMP ON UPDATE CURRENT_TIMESTAMP DEFAULT CURRENT_TIMESTAMP, \
			CONSTRAINT message_pk PRIMARY KEY USING BTREE (message_id)\
		);");
		this.db.query("CREATE TABLE IF NOT EXISTS `message_attachments` (\
			attachment_id bigint unsigned not null, \
			message_id bigint unsigned not null, \
			url varchar(2000) not null, \
			INDEX(message_id), \
			FOREIGN KEY (message_id) REFERENCES stored_messages (message_id) ON DELETE CASCADE ON UPDATE CASCADE \
		);");
		this.db.query("CREATE TABLE IF NOT EXISTS `warns` (\
			admin_id bigint unsigned not null, \
			warn_msg_id bigint unsigned not null, \
			last_msg_id bigint unsigned, \
			warned_id bigint unsigned not null, \
			INDEX(warned_id), \
			FOREIGN KEY (warn_msg_id) REFERENCES stored_messages (message_id) ON DELETE NO ACTION ON UPDATE NO ACTION, \
			FOREIGN KEY (last_msg_id) REFERENCES stored_messages (message_id) ON DELETE NO ACTION ON UPDATE NO ACTION \
		);");
		this.db.query("CREATE TABLE IF NOT EXISTS `role_permissions` ( \
			role bigint unsigned not null, \
			permission varchar(16) not null, \
			INDEX(role) \
		)");
		this.db.query("CREATE TABLE IF NOT EXISTS `previous_roles` (\
			user bigint unsigned not null, \
			role bigint unsigned not null, \
			guild bigint unsigned not null, \
			INDEX(user) \
		);");
		this.db.query("CREATE TABLE IF NOT EXISTS `nitro` (\
			discordid bigint unsigned not null, \
			first_boost timestamp not null, \
			boosting_since timestamp null, \
			PRIMARY KEY (discordid) \
		);");
		this.db.query("CREATE TABLE IF NOT EXISTS 'role_pings' (\
			ping varchar(32) not null, \
			last timestamp not null, \
			PRIMARY KEY (ping)
		);");

		this.limiter = {};

		this.commandList = {};

		const files = fs.readdirSync("./cmds");
		for (let file of files) {
			file = file.substr(0, file.length-3);
			let {Command} = require(`./cmds/${file}`);
			this.commandList[file] = Command;
		}

		this.initAPI()
	}

	async guild() {
		return await this.client.guilds.fetch("595542444737822730");
	}

	initAPI() {
		this.app = express();

		this.app.use(bdy.urlencoded({ extended: false }));
		this.app.use(bdy.json());

		this.app.listen(3000, "0.0.0.0", () => console.log("Server started on Port 3000"));

		const priv_router = express.Router();
		priv_router.use(basicAuth({
			users: config.httpAuth
		}));

		priv_router.post("/requests/github", this.githubRequest.bind(this));
		priv_router.post("/requests/deploybot", this.deploymentHook.bind(this));

		priv_router.post("/api/discord/:channel", this.discordMessage.bind(this));

		priv_router.post("/sync/:user", this.syncUser.bind(this));

		priv_router.get("*", (req, res) => {
			console.log("GET");
			res.redirect("https://pluto.gg");
		});

		this.app.post("/errors/lua/gACP9u63RYlvuqAyqKdGPnFwMVc5qNtHjRacZYPav", async (req, res) => {
			if (!req.body) {
				return;
			}

			const channel = await this.client.channels.fetch("620024525849100321");

			let error = req.body;


			channel.send(new MessageEmbed({
				color: error.realm == "server" ? 0xeb4034 : 0x34c0eb,
				title: `${error.realm} error`,
				footer: {
					text: `${error.gamemode} | v${error.gmv} | ${error.os} | ${error.ds == "true" ? "dedicated" : "not dedicated"}`
				},
				fields: [
					{
						name: error.error,
						value: error.stack
					}
				]
			}));
		});

		let cache = Object.create(null);

		this.app.get("/pluto/emojis/:emoji", async (req, res) => {
			const guild = await this.guild();
			let emoji = await guild.emojis.cache.get(req.params.emoji.toString());
			if (!emoji) {
				res.status(400).end();
				return;
			}

			if (cache[emoji.url]) {
				res.setHeader("content-type", "image/png");
				res.end(cache[emoji.url]);
				return;
			}

			let data = await new Promise((res, rej) => {
				request.get({url: emoji.url, encoding: null}, (err, resp, body) => {
					if (err) {
						return rej();
					}
					else {
						res(resp.body);
					}
				});
			});

			cache[emoji.url] = data
			res.end(data);
		});

		this.app.get("/servers", async (req, res) => {
			res.status(200).send(JSON.stringify([this.serverData]));
		});
		this.app.use("/", priv_router);
	}

	hasPermission(user, perm) {
		return new Promise((res, rej) => {
			if (user.id === this.owner || user.id === "222188163790143489") {
				res(true);
				return;
			}

			let roles = [];
			for (let role of user.roles.cache.array()) {
				roles.push(role.id);
			}

			roles.push(perm);

			this.db.query(`SELECT 1 FROM role_permissions WHERE role in (${roles.map(() => "?").slice(0, roles.length - 1).join(", ")}) AND permission = ? LIMIT 1`, roles, (err, results) => {
				if (err) {
					rej(err);
					return;
				}

				res(results.length > 0);
			});

		})
	}

	onmemberjoin(member) {
		this.db.getConnection((_, c) => {
			c.beginTransaction(err => {
				if (err)
					throw err;

				c.query("SELECT cast(role as char) as role FROM previous_roles WHERE user = ? AND guild = ?", [member.id, member.guild.id], async (err, results) => {
					if (err)
						throw err;
					for (let data of results) {
						let role = await member.guild.roles.fetch(data.role);
						if (role) {
							await member.roles.add(role, "previous role");
							member.send("I've readded the " + role.name + " role to you.");
						}
					}

					c.query("DELETE FROM previous_roles WHERE user = ? AND guild = ?", [member.id, member.guild.id], () => {
						c.commit(err => {
							if (err)
								return c.rollback(() => {
									throw err;
								});

							this.db.releaseConnection(c);
						});
					});
				});
			});
		})
	}

	onmemberleave(member) {
		for (let role of member.roles.cache.array()) {
			if (role.managed || role.name === "@everyone")
				continue;

			this.db.query("INSERT INTO `previous_roles` (user, role, guild) VALUES (?, ?, ?);", [member.id, role.id, member.guild.id]);
		}
	}

	onmessage(msg) {
		if (msg.author.bot)
			return;
		if (msg.channel.type == "dm") {
			this.sendLog("Direct Message Received",`Received a DM from ${msg.author}: \`\`\`${msg.content}\`\`\``,msg.author,"#FF0000");
		}
		if (!msg.guild) {
			return;
		}

		/*this.db.execute(
			"INSERT INTO `stored_messages` (guild_id, channel_id, message_id, sender_id, text) values (?, ?, ?, ?, ?)",
			[
				msg.guild.id,
				msg.channel.id,
				msg.id,
				msg.author.id,
				msg.content
			]
		);

		for (let att of msg.attachments.array()) {
			this.db.execute(
				"INSERT INTO `message_attachments` (attachment_id, message_id, url) values (?, ?, ?)",
				[
					att.id,
					msg.id,
					att.url
				]
			);
		}*/

		if (msg.content.toLowerCase().indexOf("styx ") === 0)
			this.runCommand(msg).catch(console.error);
	}

	skipWhitespace(str, idx) {
		for (let i = idx; i < str.length; i++) {
			let chr = str.charAt(i);
			if (chr == ' ' || chr == '\v' || chr == '\t' || chr == '\n' || chr == '\r')
				continue;
			return i;
		}
		return str.length;
	}

	acquireArgument(str, idx) {
		let inside = str.charAt(idx);
		if (inside !== '"' && inside !== "'")
			inside = null;
		else
			idx++;

		let start = idx;

		for (let ends = start; ends < str.length; ends++) {
			let chr = str.charAt(ends);
			if (inside == chr) {
				return [str.slice(start, ends), ends + 1];
			}
			else if (!inside && this.skipWhitespace(str, ends) !== ends) {
				return [str.slice(start, ends), ends]
			}
		}

		return null;
	}

	async runCommand(msg) {
		let limit = this.limiter[msg.author.id];
		if (limit && limit > Date.now())
			return;

		let text = msg.content;

		let cur_idx = this.skipWhitespace(text, 5);
		let start = cur_idx;

		let cmd;

		for (let i = start; i < text.length; i++) {
			cur_idx = this.skipWhitespace(text, i);
			if (i !== cur_idx) {
				cmd = text.slice(start, i);
				break;
			}
		}

		if (!cmd) {
			cmd = text.slice(start);
			cur_idx = text.length;
		}

		let Command = this.commandList[cmd];

		if (!cmd || !Command) {
			msg.channel.send("That's not a valid command!");
			this.limiter[msg.author.id] = Date.now() + 1000 * 5;
			return;
		}

		if (!await this.hasPermission(msg.guild.members.cache.get(msg.author.id), cmd)) {
			msg.channel.send("You don't have permission.");
			this.limiter[msg.author.id] = Date.now() + 1000 * 5;
			return;
		}

		let args = Command.arguments();
		let new_args = [];
		try {
			for (cur_idx; cur_idx < text.length; cur_idx = this.skipWhitespace(text, cur_idx)) {
				let Constructor = args[new_args.length];
				if (!Constructor)
					break;
				let a = new Constructor(this, text, cur_idx, msg);
				if (!a.length)
					break;
				cur_idx += a.length;
				new_args.push(a.data);
			}
		}
		catch (e) {
			msg.reply("You caused an error.");
			this.limiter[msg.author.id] = Date.now() + 1000 * 5;
			console.error(e);
			return;
		}

		try {
			new Command(this, msg, new_args);
			this.sendLog("Command Log", `${msg.author} ran the "${cmd}" command with args "${new_args.toString()}".`, msg.member, "#36393E");
		}
		catch (e) {
			if (e.toSafeString) {
				msg.reply(e.toSafeString());
			}
			else {
				msg.reply(`Error! ${e.message}\n${e.stack}`);
			}
		}

		// msg.reply("this is a command yes");
	}

	async onready() {
		console.log(`Logged into discord: ${this.client.user.tag}`);

		if (this.serverUpdater) {
			return;
		}

		this.client.channels.fetch("634573491185778688").then(async channel => {
			let msgs = await channel.messages.fetchPinned();
			let msg = msgs.array()[0];
			this.serverUpdater = new Updater(this, msg);
		});

		this.client.channels.fetch("846573820550578187").then(async channel => {			
			let early_msg = await channel.messages.fetch("846877728857653268");
			
			let early_collector = early_msg.createReactionCollector(() => {
				return true;
			});
			
			early_collector.on("collect", async (react, user) => {
				let gmember = await channel.guild.members.fetch(user.id);
				if (gmember.roles.cache.get("846572582702546984")) {
					return;
				}
				gmember.roles.add("846572582702546984");
			});
			early_collector.on("remove", async (react, user) => {
				let gmember = await channel.guild.members.fetch(user.id);
				if (gmember.roles.cache.get("846572582702546984")) {
					gmember.roles.remove("846572582702546984");
				}
			});
			early_collector.on("end", () => console.log("end?"));
			
			let late_msg = await channel.messages.fetch("846877746839683083");
			
			let late_collector = late_msg.createReactionCollector(() => {
				return true;
			});
			
			late_collector.on("collect", async (react, user) => {
				let gmember = await channel.guild.members.fetch(user.id);
				if (gmember.roles.cache.get("846572762575536138")) {
					return;
				}
				gmember.roles.add("846572762575536138");
			});
			late_collector.on("remove", async (react, user) => {
				let gmember = await channel.guild.members.fetch(user.id);
				if (gmember.roles.cache.get("846572762575536138")) {
					gmember.roles.remove("846572762575536138");
				}
			});
			late_collector.on("end", () => console.log("end?"));
			
			let other_msg = await channel.messages.fetch("846877778171527169");
			let other_joined = await this.client.channels.fetch("611449167994159134");
			
			let other_collector = other_msg.createReactionCollector(() => {
				return true;
			});
			other_collector.on("collect", async (react, user) => {
				let gmember = await channel.guild.members.fetch(user.id);
				if (gmember.roles.cache.get("799239379658080266")) {
					return;
				}
				gmember.roles.add("799239379658080266");
				other_joined.send(`<@${user.id}> has joined [account created at ${Math.floor(DateTime.fromJSDate(user.createdAt).diffNow().negate().as("days"))} days ago, joined ${Math.floor(DateTime.fromJSDate(gmember.joinedAt).diffNow().negate().as("days"))} days ago]`)
			});
			other_collector.on("remove", async (react, user) => {
				let gmember = await channel.guild.members.fetch(user.id);
				if (gmember.roles.cache.get("799239379658080266")) {
					gmember.roles.remove("799239379658080266");
				}
			});
			other_collector.on("end", () => console.log("end?"));
		});

		/*
		let guild = await this.client.guilds.fetch("595542444737822730");
		guild.members.fetch().then(async members => {
			let role = await guild.roles.fetch("813870659401678919")
			console.log("starting role processing...");
			for (let member of members.array()) {
				await member.roles.add(role);
			}
			console.log("done adding roles");
		});
		*/
	}

	login(key) {
		this.client.login(key);
		console.log("logged in")
	}

	setOwner(owner) {
		this.owner = owner;
	}

	setJail(role) {
		this.jail = role;
	}

	setLog(channel) {
		this.logChannel = channel;
	}

	async sendLog(title, message, user, color) {
		user = user.user || user || this.client.user;
		color = color || "#36393E";
		let channel = await (await this.guild()).channels.fetch(this.logChannel);

		channel.send(new MessageEmbed()
			.setColor(color)
			.setTitle(title)
			.setAuthor(user.username+"#"+user.discriminator,user.avatarURL)
			.setDescription(message)
			.setTimestamp());
	}

	githubRequest(req, res) {
		res.status(200).send("Success");
		const type = req.header("X-GitHub-Event");
		if (type === "push") {
			const body = req.body;
			let emb = this.createEmbed();
			emb.setAuthor(body["sender"]["login"], body["sender"]["avatar_url"], body["sender"]["html_url"]);
			emb.setTitle(`[${body["repository"]["full_name"]}] ${body["commits"].length} new commit${body["commits"].length === 1 ? "" : "s"}`);
			if (body["repository"]["full_name"] == "meepen/pluto-inv") {
				emb.setColor("#9930e9");
			} else if (body["repository"]["full_name"] == "meepen/styx") {
				emb.setColor("#4d8881");
			}
			emb.setURL(body["compare"]);
			emb.setTimestamp();
			emb.setFooter("branch: "+body["ref"].substr(11,body["ref"].length));
			let commits = "";
			body["commits"].forEach(commit => {
				if (commit["message"].charAt(0) == ":") {
					commits = commits + `[\`${commit["id"].substr(0,7)}\`](${commit["url"]}) This message has been marked as hidden.\n`;
				} else {
					commits = commits + `[\`${commit["id"].substr(0, 7)}\`](${commit["url"]}) ${commit["message"]}\n`;
				}
			});
			emb.setDescription(commits);
			this.client.guilds.cache.get("595542444737822730").channels.cache.get("609026158566309898").send(emb);
		}
	}

	deploymentHook(req, res) {
		res.status(200).send("Success");
		console.log("========== DeployBot Message ==========");
		console.log(req.body);
		const body = req.body;
		let commit = body["revision"].substr(0, 7);
		let message = body["message"];
		let target = body["server"];
		let emb = this.createEmbed();
		emb.setColor("#80CEE1");
		emb.setAuthor("DeployBot", "https://deploybot.com/images/saas-prod-deploybot.png");
		emb.setTitle("Deployment Complete");
		emb.setDescription(`${body["repository"]}/${body["environment"]} deployed to ${body["server"]}\n${body["comment"]} - ${body["author_name"]}`);
		emb.setTimestamp();
		this.client.guilds.cache.get("595542444737822730").channels.cache.get("634572018729222164").send(emb);
	}

	async discordMessage(req, res) {
		let guild = await this.guild();

		let ch = await guild.channels.fetch(req.params.channel);
		if (ch === undefined) {
			res.status(400).send("bad channel");
		} else {
			res.status(200).send("Success");
			if ("content" in req.body) {
				ch.send(req.body.content, {embed: req.body.embed});
			} else {
				ch.send({embed: req.body.embed});
			}
		}
	}

	async syncUser(req, res) {
		let guild = await this.guild();
		const forumsrole = await guild.roles.fetch("661013927940980749");
		let userid = req.params.user.toString();
		let user = await guild.members.fetch(userid);

		await user.roles.add(forumsrole);

		if (user) {
			let apikey = "aa704e83baf21a363f577ce7f8d944a6";
			request(`https://pluto.gg/api/discord/snowflake/${userid}`, {
				auth: {
					"user": apikey
				}
			},
			async (error, resp, body) => {
				if (!error && resp.statusCode === 200) {
					let roleid = JSON.parse(body)["role"];
					if (roleid != -1) {
						let role = await guild.roles.fetch(roleid);
						console.log(role, JSON.parse(body)["role"])
						await user.roles.add(role);
						user.send(`Added the role ${role.name} to you.`);
					}

					res.status(200).send("Success");
				}
			});
		} else {
			res.status(400).send("bad user");
		}
	}

	async updateNitros() {
		console.log("NITRO UPDATE STARTED");
		const pluto = await this.guild();
		const boost = "608829202258591775";

		console.log("REMOVING");
		this.db.query("SELECT CAST(discordid as CHAR) as discordid FROM nitro WHERE boosting_since IS NOT NULL;", async (err, nitros, fields) => {
			if (err) throw err;
			for (let i = 0; i < nitros.length; i++) {
				let member = await pluto.members.fetch(nitros[i].discordid);
				if (!member || !member.premiumSinceTimestamp) {
					console.log("REMOVING MEMBER: ", nitros[i]);
					this.db.query("UPDATE nitro SET boosting_since = NULL WHERE discordid = ?;",[nitros[i].discordid], (err) => {
						if (err) throw err;
					});
				}
			}

			console.log("ADDING");
			let role = await pluto.roles.fetch(boost)
			for (let member of role.members.array()) {
				let ts = moment(member.premiumSinceTimestamp).format("YYYY-MM-DD HH:mm:ss");
				this.db.query("INSERT INTO nitro (discordid, first_boost, boosting_since) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE boosting_since = VALUE (boosting_since);",
					[member.id, ts, ts], err => {
						if (err) throw err;
					});
			};
		});
	}

	createEmbed(data) {
		return new MessageEmbed(data);
	}
};
