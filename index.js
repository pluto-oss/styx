// STYX BOT RELATED \\

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
if ("logs" in config.discord)
	bot.setLog(config.discord.logs);

// WEB FUNCTIONS \\

const express = require("express");
const bdy = require("body-parser");
const basicAuth = require("express-basic-auth");

bot.app = express();

bot.app.use(bdy.urlencoded({ extended: false }));
bot.app.use(bdy.json());
bot.app.use(basicAuth({
	users: config.httpAuth
}));

bot.app.listen(3000, "0.0.0.0", () => console.log("Server started on Port 3000"));

bot.app.post("/requests/github", bot.githubRequest.bind(bot));
bot.app.post("/requests/deploybot", bot.deploymentHook.bind(bot));

bot.app.post("/api/discord/:channel", bot.discordMessage.bind(bot));

bot.app.post("/sync/:user", bot.syncUser.bind(bot));

bot.app.get("*", (req, res) => {
	console.log("GET");
	res.redirect("https://pluto.gg");
});
