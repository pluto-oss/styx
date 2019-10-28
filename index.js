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
//const session = require("express-session");

bot.app = express();

bot.app.use(bdy.urlencoded({ extended: false }));
bot.app.use(bdy.json());

bot.app.listen(3000, function() {
	console.log("Server started on Port 3000");
});

bot.app.post("/requests/github", bot.githubRequest.bind(this));
bot.app.post("/requests/deploybot", bot.deploymentHook.bind(this));

bot.app.post("/api/discord", bot.discordMessage.bind(this));

bot.app.get("/verify", (req, res) => {
	res.status(200).sendFile("web/verify.html", { root: __dirname });
});

bot.app.get("*", (req, res) => {
	res.redirect("https://pluto.gg");
});