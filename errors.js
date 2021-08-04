export default class ArgumentError {
	constructor(types, ind) {
		this.types = types;
		this.ind = ind;
	}

	toSafeString() { 
		return "Expected " + this.types.map(x => x.name).join(", ") + " but didn't get " + this.types[this.ind].name + " at " + (this.ind + 1);
	}
}