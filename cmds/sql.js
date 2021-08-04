import Text from "../args/text.js";

export default class SQLCommand {
    constructor(bot, msg, args) {
        bot.db.query(args[0], function(err, result) {
            if (err) throw err;
            console.log(result);
        })
    }

    static arguments() {
        return [Text];
    }

    static help() {
        return "If you don't know what this command does already, you shouldn't use it.";
    }
}