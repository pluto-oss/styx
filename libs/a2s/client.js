const dgram = require("dgram");
const events = require("events");
const dns = require("dns");

const sock = dgram.createSocket("udp4");

class PacketHelper {
	static readString(buf, offset) {
		for (let i = offset; i < buf.length; i++) {
			if (buf[i] == 0)
				return [i + 1, buf.toString("utf8", offset, i)];
		}

		throw new Error("Invalid string");
	}
}

class A2S_Info {
	constructor() { }

	toBuffer() {
		const data = "TSource Engine Query";
		let buf = Buffer.alloc(data.length + 5);
		buf.writeUInt32LE(0xFFFFFFFF, 0);
		buf.write(data, 4);

		return buf;
	}
}

class A2S_GetChallenge {
	constructor(secret = Math.floor(Math.random() * 0xFFFFFFF)) {
		this.secret = secret;
	}

	toBuffer() {
		let buf = Buffer.alloc(5 + 4 + 11);
		buf.writeUInt32LE(0xFFFFFFFF);
		buf.writeUInt8(0x71, 4);
		buf.writeUInt32LE(this.secret, 5);
		buf.write("0".repeat(10), 9);
		return buf;
	}
}

const VERSION = "2019.11.12";

class C2S_Connect {
	constructor(name, password, challenge, secret, key) {
		this.name = Buffer.from(name, "ascii");
		this.password = Buffer.from(password, "ascii");
		this.challenge = challenge;
		this.key = key;
		this.secret = secret;

		if (this.key.length > 2048) {
			console.warn(`WARN: C2S_Connect key size too big: ${this.key.length}`);
		}
	}
	toBuffer() {
		let buf = Buffer.alloc(5 + 4 + 4 + 4 + 4 + 4 + this.name.length + 1 + this.password.length + 1 + VERSION.length + 1 + 2 + this.key.length);
		let offset = buf.writeUInt32LE(0xFFFFFFFF);
		offset = buf.writeUInt8("k".charCodeAt(0), offset);
		offset = buf.writeInt32LE(24, offset);
		offset = buf.writeInt32LE(3, offset);
		offset = buf.writeUInt32LE(this.challenge, offset);
		offset = buf.writeUInt32LE(this.secret, offset);
		offset = buf.writeUInt32BE(0xE7CDB0A2, offset);
		offset += this.name.copy(buf, offset, 0) + 1;
		offset += this.password.copy(buf, offset, 0) + 1;
		offset += buf.write(VERSION, offset, "ascii") + 1;
		offset = buf.writeUInt16BE(this.key.length, offset);
		offset += this.key.copy(buf, offset, 0) + 1;

		return buf;
	}
}

class A2S_GetChallengeResponse {
	constructor(buf) {
		this.challenge = buf.readUInt32LE(9);
		this.secret = buf.readUInt32LE(13);
	}
}

class A2S_InfoResponse {
	constructor(buf) {
		if (buf.readUInt32LE(0) !== 0xFFFFFFFF) {
			throw new Error("Invalid Response");
		}

		if (buf.readUInt8(4) !== 0x49) {
			throw new Error("Not A2S_Info Response!");
		}
		
		this.protocol = buf.readUInt8(5);

		let offset;
		[offset, this.serverName] = PacketHelper.readString(buf, 6);
		[offset, this.mapName] = PacketHelper.readString(buf, offset);
		[offset, this.folderName] = PacketHelper.readString(buf, offset);
		[offset, this.gameName] = PacketHelper.readString(buf, offset);

		this.gameID = buf.readUInt16LE(offset);
		offset += 2;

		this.players = buf.readUInt8(offset++);
		this.maxPlayers = buf.readUInt8(offset++);
		this.bots = buf.readUInt8(offset++);

		this.serverType = buf.readUInt8(offset++);

		this.environment = buf.readUInt8(offset++);

		this.visibility = buf.readUInt8(offset++);
		this.vac = buf.readUInt8(offset++);

		[offset, this.version] = PacketHelper.readString(buf, offset);
		this.edf = buf.readUInt8(offset++);

		if (this.edf & 0x80) {
			this.port = buf.readUInt16LE(offset);
			offset += 2;
		}

		if (this.edf & 0x10) {
			this.steamID = [buf.readUInt32LE(offset), buf.readUInt32LE(offset + 4)];
			offset += 8;
		}

		if (this.edf & 0x40) {
			this.srctv = {
				port: buf.readUInt16LE(offset)
			};

			[offset, this.srctv.name] = PacketHelper.readString(buf, offset + 2);
		}

		if (this.edf & 0x20) {
			[offset, this.keywords] = PacketHelper.readString(buf, offset);
		}

		if (this.edf & 0x01) {
			this.gameID = [buf.readUInt32LE(offset), buf.readUInt32LE(offset + 4)];
			offset += 8;
		}
	}
}

class S2C_ConnReject {
	constructor(msg) {
		let offset;
		[offset, this.reason] = PacketHelper.readString(msg, 9);
	}
}

let Distributor = Object.create(null); // Distributor[address][port] = FakeClient

var FakeClient = module.exports.FakeClient = class FakeClient extends events.EventEmitter {
	constructor(remote) {
		super();
		this.address = remote.address;
		this.port = remote.port;

		if (!Distributor[this.address])
			Distributor[this.address] = {}
		
		Distributor[this.address][this.port] = this;

		this.on("message", this.onmessage);
		this.on("challenge", this.onchallenge);
		this.on("connreject", this.onreject);
	}

	static fromAddress(address, port, timeout = 10000) {
		return new Promise((res, rej) => {
			let tm = setTimeout(() => {
				rej(new Error("timeout"));
			}, timeout);

			dns.lookup(address, 4, (err, addr, family) => {
				if (err)
					return rej(err);
				
				if (family !== 4)
					return;
				
				res(new FakeClient({
					port: port,
					address: addr
				}));

				clearTimeout(tm);
			});
		});
	}

	onmessage(msg, rinfo) {
		try {
			let type = msg.readUInt32LE(0);
			if (type == 0xFFFFFFFF) {
				let tp = msg.readUInt8(4);
				switch (tp) {
					case 0x49:
						this.emit("info", new A2S_InfoResponse(msg));
						break;

					case 0x41:
						this.emit("challenge", new A2S_GetChallengeResponse(msg));
						break;

					case 0x39:
						this.emit("connreject", new S2C_ConnReject(msg));
						break;

					default:
						console.log(`Unknown type: ${tp}`);
						break;
				}
			}
			else {
				console.log("Not handled: " + type);
			}
		}
		catch (e) {
			
		}
	}

	onchallenge(challenge) {
		if (this.signonState == "challenge") {
			let {name, password, secret, key} = this.signon;
			this.send(new C2S_Connect(name, password, challenge.challenge, secret, key).toBuffer());
		}
	}

	onreject(challenge) {
		if (this.signonState == "challenge") { // spoofed?
			this.signonState = "rejected";
		}
	}

	send(msg) {
		return new Promise((res, rej) => {
			sock.send(msg, this.port, this.address, (err, len) => {
				if (err)
					rej(err);
				else
					res(len);
			});
		})
	}

	getInfo(timeout = 10000) {
		return new Promise(async (res, rej) => {
			await this.send(new A2S_Info().toBuffer());
			let start = Date.now();

			let tm = setTimeout(() => {
				rej(new Error("timeout"));
			}, timeout);
			this.once("info", info => {
				info.ping = (Date.now() - start) / 1000;
				this.lastInfo = info;
				res(info);
				clearTimeout(tm);
			});
		});
	}

	getChallenge(secret, timeout = 10000) {
		return new Promise(async (res, rej) => {
			let challenge = new A2S_GetChallenge(secret);
			secret = challenge.secret;

			let start = Date.now();
			await this.send(challenge.toBuffer());

			let tm = setTimeout(() => {
				rej(new Error("timeout"));
			}, timeout);
			this.once("challenge", info => {
				if (info.secret !== secret)
					return rej(new Error("WRONG SECRET"));
				info.ping = (Date.now() - start) / 1000;
				this.lastChallenge = info;
				res(info);
				clearTimeout(tm);
			});
		});
	}

	connect(name, password, key, secret = 0x13371337, timeout = 10000) {
		return new Promise(async (res, rej) => {
			this.signon = {
				name,
				password,
				key,
				secret
			};
			this.signonState = "challenge";

			let start = Date.now();
			let tm = setTimeout(() => {
				delete this.signonState;
				rej(new Error("timeout"));
			}, timeout);

			this.once("connreject", info => {
				info.ping = (Date.now() - start) / 1000;
				this.lastChallenge = info;
				res(info);
				clearTimeout(tm);
			});

			await this.getChallenge(secret);
		});
	}
}


sock.bind(async () => {
	sock.on("message", (msg, rinfo) => {
		let FromAddress = Distributor[rinfo.address];
		if (!FromAddress) {
			console.log(`unknown address for address: ${rinfo.address}:${rinfo.port}`);
			return; // alert?
		}
		
		if (!FromAddress[rinfo.port]) {
			console.log(`unknown port for address: ${rinfo.address}:${rinfo.port}`);
			return; // alert?
		}

		FromAddress[rinfo.port].emit("message", msg, rinfo);
	});
})