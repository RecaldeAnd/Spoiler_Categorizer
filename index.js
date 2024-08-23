// The fs module is Node's native file system module. 
//fs is used to read the commands directory and identify our command files.
const fs = require('node:fs');
// The path module is Node's native path utility module. 
//path helps construct paths to access files and directories. 
//One of the advantages of the path module is that it automatically detects the operating system and uses the appropriate joiners.
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');
const { token } = require('./config.json');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessages] });

// We recommend attaching a .commands property to your client instance 
// so that you can access your commands in other files. The rest of the 
// examples in this guide will follow this convention. 
client.commands = new Collection();
// The Collection class extends JavaScript's native Map class, and includes more extensive, useful functionality. 
// Collection is used to store and efficiently retrieve commands for execution.

// First, path.join() helps to construct a path to the commands directory. 
// The first fs.readdirSync() method then reads the path to the directory 
// and returns an array of all the folder names it contains, currently ['utility']
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
    // The second fs.readdirSync() method reads the path to this directory and returns
    // an array of all the file names they contain, currently ['ping.js', 'server.js', 'user.js']
    // To ensure only command files get processed, Array.filter() removes any non-JavaScript files from the array.
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    // With the correct files identified, the last step is dynamically set each command into the client.commands Collection
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		
		// Set a new item in the Collection with the key as the command name and the value as the exported module
        // For each file being loaded, check that it has at least the data and execute properties.
		if ('data' in command && 'execute' in command) {
			console.log(command.data.name);
			client.commands.set(command.data.name, command);
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

// Therefore, the client object exposes the .on() and .once() methods that you can use to register event listeners.
// These methods take two arguments: the event name and a callback function. These are defined in your separate event files as name and execute.
for (const file of eventFiles) {
	const filePath = path.join(eventsPath, file);
	const event = require(filePath);
	if (event.name == "messageCreate") {
		console.log(event.name);
	} else if (event.once) {
		client.once(event.name, (...args) => event.execute(...args));
	} else {
		client.on(event.name, (...args) => event.execute(...args));
	}
}

client.login(token);