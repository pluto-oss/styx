const {Client} = require("discord.js");

module.exports.Bot = class Bot {
	constructor(db) {
		this.db = db;
		this.client = new Client({
			disableEveryone: true
		});
		this.client.on("ready", this.onready.bind(this));
		this.client.on("message", this.onmessage.bind(this));
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
			warn_id bigint unsigned not null, \
			last_msg_id bigint unsigned, \
			warned_id bigint unsigned not null, \
			INDEX(warned_id), \
			FOREIGN KEY (warn_id) REFERENCES stored_messages (message_id) ON DELETE NO ACTION ON UPDATE NO ACTION, \
			FOREIGN KEY (last_msg_id) REFERENCES stored_messages (message_id) ON DELETE NO ACTION ON UPDATE NO ACTION \
		);");

		this.limiter = {};

		this.commandList = {}

		for (let cmd of ["test"]) {
			let {Command} = require(`./cmds/${cmd}`);
			this.commandList[cmd] = Command;
		}
	}

	onmessage(msg) {
		if (msg.author.bot)
			return;
		if (!msg.guild) {
			msg.reply("im gay");
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
			this.runCommand(msg);
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

	runCommand(msg) {
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

		let args = Command.arguments();
		let new_args = [];
		try {
			for (cur_idx; cur_idx < text.length; cur_idx = this.skipWhitespace(text, cur_idx)) {
				let a = new args[new_args.length](this.client, text, cur_idx);
				if (!a.length)
					break;
				cur_idx += a.length;
				new_args.push(a);
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
	}

	setOwner(owner) {
		this.owner = owner;
	}
}

