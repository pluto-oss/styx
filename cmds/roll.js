export default class RollCommand {
    constructor(bot,msg) {
        msg.reply(["heads","tails"][Math.floor(Math.random()*2)]);
    }

    static arguments() {
        return [];
    }

    static help() {
        return "rolls coin";
    }
}