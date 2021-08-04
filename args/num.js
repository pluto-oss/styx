export default class Num {
    constructor(bot, text, ind) {
        let value = text.slice(ind);
        value = value.split(" ")[0];
        if (Number(value) != "NaN") {
            this.data = Number(value);
            this.length = value.length;
        }
    }
}