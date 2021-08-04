export default class Text {
	constructor(bot, text, ind) {
		this.data = text.slice(ind);
		this.length = text.length - ind;
	}
}