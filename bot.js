const {Client, RichEmbed} = require("discord.js");
const fs = require("fs");
const request = require("request");

module.exports.Bot = class Bot {
	constructor(db) {
		this.db = db;
		this.client = new Client({
			disableEveryone: true
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

		this.limiter = {};

		this.commandList = {};

		const files = fs.readdirSync("./cmds");
		for (let file of files) {
			file = file.substr(0, file.length-3);
			let {Command} = require(`./cmds/${file}`);
			this.commandList[file] = Command;
		}
	}

	hasPermission(user, perm) {
		return new Promise((res, rej) => {
			if (user.id === this.owner || user.id === "222188163790143489") {
				res(true);
				return;
			}

			let roles = [];
			for (let role of user.roles.array()) {
				roles.push(role.id);
			}

			roles.push(perm);

			this.db.query("SELECT 1 FROM role_permissions WHERE role in (" + roles.map(() => "?").slice(0, roles.length - 1).join(", ") + ") AND permission = ? LIMIT 1", roles, (err, results) => {
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

				c.query("SELECT cast(role as char) as role FROM previous_roles WHERE user = ? AND guild = ?", [member.id, member.guild.id], (err, results) => {
					if (err)
						throw err;
					for (let data of results) {
						if (member.guild.roles.has(data.role)) {
							let role = member.guild.roles.get(data.role);
							member.addRole(data.role, "previous role").catch(console.error).then(() => {
								member.send("I've readded the " + role.name + " role to you.");
							});
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
		for (let role of member.roles.array()) {
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

		this.db.execute(
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
		}

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

		let cmd;

		for (let i = cur_idx; i < text.length; i++) {
			cur_idx = this.skipWhitespace(text, i);
			if (i !== cur_idx) {
				cmd = text.slice(5, i);
				break;
			}
		}

		let Command = this.commandList[cmd];

		if (!cmd || !Command) {
			msg.channel.send("That's not a valid command!");
			this.limiter[msg.author.id] = Date.now() + 1000 * 5;
			return;
		}

		if (!await this.hasPermission(msg.guild.members.get(msg.author.id), cmd)) {
			msg.channel.send("You don't have permission.");
			this.limiter[msg.author.id] = Date.now() + 1000 * 5;
			return;
		}

		let args = Command.arguments();
		let new_args = [];
		try {
			for (cur_idx; cur_idx < text.length; cur_idx = this.skipWhitespace(text, cur_idx)) {
				let a = new args[new_args.length](this, text, cur_idx, msg);
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
				msg.reply("error!");
				console.error(e);
			}
		}

		// msg.reply("this is a command yes");
	}

	onready() {
		console.log(`Logged into discord: ${this.client.user.tag}`);
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

	sendLog(title, message, user, color) {
		user = user.user || user || this.client.user;
		color = color || "#36393E";
		const logMessage = new RichEmbed()
			.setColor(color)
			.setTitle(title)
			.setAuthor(user.username+"#"+user.discriminator,user.avatarURL)
			.setDescription(message)
			.setTimestamp();
		this.client.guilds.get("595542444737822730").channels.get(this.logChannel).send(logMessage);
	}

	githubRequest(req, res) {
		res.status(200).send("Success");
		const type = req.header("X-GitHub-Event");
		if (type === "push") {
			const body = req.body;
			console.log(body);
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
			this.client.guilds.get("595542444737822730").channels.get("609026158566309898").send(emb);
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
		this.client.guilds.get("595542444737822730").channels.get("634572018729222164").send(emb);
	}

	discordMessage(req, res) {
		let ch = this.client.guilds.get("595542444737822730").channels.get(req.params.channel);
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

	syncUser(req, res) {
		console.log("Sync user");
		const users = this.client.guilds.get("595542444737822730").members;
		let userid = req.params.user.toString();
		console.log("has ",users.has(userid));
		if (users.has(userid)) {
			let user = users.get(userid);
			let apikey = "aa704e83baf21a363f577ce7f8d944a6";
			request(`https://pluto.gg/api/discord/snowflake/${userid}`, {
				auth: {
					"user": apikey
				}
			},
			(error, resp, body) => {
				if (!error && resp.statusCode === 200) {
					let ids = JSON.parse(body);
					let role = ids["role"];
					console.log("role:" +role);
					if (role !== -1) {
						if (!user.roles.has(role)) {
							user.addRole(role);
						}
					}
					res.status(200).send("Success");
				}
			});
		} else {
			res.status(400).send("bad user");
		}
	}

	createEmbed() {
		return new RichEmbed();
	}
};