const mysql = require("mysql2");
const config = require("./config");

const {Bot} = require("./bot");

const pools = mysql.createPool({
	host: config.mysql.host,
	user: config.mysql.user,
	password: config.mysql.password,
	database: config.mysql.database,
	connectionLimit: 10,
	queueLimit: 0,
	waitForConnections: true,
	charset: 'utf8mb4'
});


const bot = new Bot(pools);
bot.login(config.discord.key);
if ("owner" in config.discord)
	bot.setOwner(config.discord.owner);
if ("jail" in config.discord) 
	bot.setJail(config.discord.jail);