const net = require('net');
let testData = require('testData');

function sendWithCost(key, value) {
	send(key, value);
	decreasePower();
}


client.connect(port, host, function() {

	sendWithCost('id', {robot: process.argv[2], account: process.argv[3]});
	send('message', 'hi');
	console.log('Connected');

});

var pos = {
	x: parseInt(process.argv[4]) || 4,
	y: parseInt(process.argv[5]) || 4,
	z: parseInt(process.argv[6]) || 4
}

client.on('data', (rawMessages)=>{
	console.log('Received: ' + rawMessages);
	messages = String(rawMessages).split('\r\n').filter(s=>s).map(JSON.parse);
	for (var data of messages) {
		if (data.command) {
			
			if (data.command == 'for i=-2,5 do sendScan.volume(-3, -3, i, 8, 8, 1); end return true;') {
				console.log('sending map!');
				sendWithCost('map data', testData.scan);
			}
			else if (data.command == 'return int.sendInventoryData(-1);') {
				console.log('sending inventory!');
				sendWithCost('inventory data', testData.internalInventory.meta);
				for (slot of testData.internalInventory.slots) {sendWithCost('slot data', slot);}
				sendWithCost('inventory data', testData.externalInventory.meta);
				for (slot of testData.externalInventory.slots) {sendWithCost('slot data', slot);}
			}
			else if (data.command == 'return pos.sendLocation();') {
				console.log('sending location')
				sendWithCost('robot position', pos);
			}
			else if (data.command == "local conf = require('config'); require('tcp').write({['available components']=conf.get(conf.path).components});") {
				var components = process.argv[7] ? {raw:true} : {};
				sendWithCost('available components', components);
			}
			else {
				console.log('responding to command: ' + data.command);
				sendWithCost('command result', [true, 'received command: ' + data.command]);
			}

		}
		else if (data.message) {
			console.log(data.message);
		}
	}
});

client.on('close', function() {
	console.log('Connection closed');
});

var offset = 1;
setInterval(()=>{
	pos.y += offset;
	sendWithCost('robot position', pos);
	offset *= -1;
}, 1000 * 5);

class testClient {

	constructor(testData) {
		this.testData = testData;
		this.client = new net.Socket();
		this.client.connect(this.testData.port, this.testData.host, this.connectionListener);
		this.robotName = this.testData.robotName;
		this.accountName = this.testData.accountName;
		this.dimension = this.testData.dimension;
		this.power = 1;
		this.writeBufferLength = 20;
		this.delimiter = '\r\n';
	}

	send(key, value) {

		let data = {};
		data[key] = value;
		const serializedData = JSON.stringify(data) + this.delimiter;

		if (serializedData.length > this.writeBufferLength) {
			const chunkRegExp = new RegExp('[\\s\\S]{1,' + this.writeBufferLength + '}', 'g');
			const dataChunks = serializedData.match(chunkRegExp) || [];
			dataChunks.map(this.client.write, this.client);
		}
		else {
			this.client.write(serializedData);
		}

	}

	connectionListener() {
		this.sendWithCost('id', {robot: process.argv[2], account: process.argv[3]});
		this.send('message', 'hi');
		console.log('Connected');
	}

	addNoise(scan) {
		let mapData = this.testData.scan.data;
		for (var key in mapData) {
			if (mapData[key] == 1) {
				mapData[key] = Math.random() * 6;
			}
		}
	}

	decreasePower() {
		this.power -= .02 * Math.random();
		send('power level', this.power);
	}

}

module.exports = testClient;