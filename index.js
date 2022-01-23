import {CronJob} from "cron";
import {readFile} from "fs/promises";

import mysql from "mysql2";
import Bot from "./bot.js";

global.config = JSON.parse(
	await readFile(
		new URL('./config.json', import.meta.url)
	)
);

const pools = mysql.createPool({
	host: config.mysql.host,
	user: config.mysql.user,
	port: config.mysql.port,
	password: config.mysql.password,
	database: config.mysql.database,
	connectionLimit: 10,
	queueLimit: 0,
	waitForConnections: true,
	charset: 'utf8mb4',
	multipleStatements: true
});

const bot = new Bot(pools);
bot.login(config.discord.key);

if ("owner" in config.discord)
	bot.setOwner(config.discord.owner);
if ("jail" in config.discord)
	bot.setJail(config.discord.jail);
if ("logs" in config.discord)
	bot.setLog(config.discord.logs);

const job = new CronJob("0 0 * * * *", () => {
	console.log("cron trigger");
	bot.updateNitros();
});
job.start();

