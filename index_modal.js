// The fs module is Node's native file system module. 
//fs is used to read the commands directory and identify our command files.
const fs = require('node:fs');
// The path module is Node's native path utility module. 
//path helps construct paths to access files and directories. 
//One of the advantages of the path module is that it automatically detects the operating system and uses the appropriate joiners.
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');
const { token } = require('./config.json');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// When the client is ready, run this code (only once).
// The distinction between `client: Client<boolean>` and `readyClient: Client<true>` is important for TypeScript developers.
// It makes some properties non-nullable.
client.once(Events.ClientReady, readyClient => {
	console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

// Log in to Discord with your client's token
client.login(token);

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
			client.commands.set(command.data.name, command);
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

// To respond to a command, you need to create a listener for the Client#interactionCreate event that
// will execute code when your application receives an interaction
// needs to be async so we can use await below
client.on(Events.InteractionCreate, async interaction => {
    //Not every interaction is a slash command (e.g. MessageComponent interactions). Make sure to only handle 
    // slash commands in this function by making use of the BaseInteraction#isChatInputCommand()
    if (!interaction.isChatInputCommand()) return;
	console.log(interaction);

    // First, you need to get the matching command from the client.commands
    const command = interaction.client.commands.get(interaction.commandName);

	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

    // With the right command identified, all that's left to do is call the command's 
    // .execute() method and pass in the interaction variable as its argument.
	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
		} else {
			await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
		}
	}
});

const { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

client.on(Events.MessageCreate, async message => {
	const pattern = /\|\|(.*?)\|\|/gs;
	console.log("In Message Create");

	if (pattern.test(message.content)) {
		console.log("In if statement");
		const modal = new ModalBuilder()
			.setCustomId('mySpoilerModal')
			.setTitle('Spoiler Modal');

		// TODO: Add components to modal...

        // Create the text input components
		const bookTitleInput = new TextInputBuilder()
            .setCustomId('bookTitleInput')
            // The label is the prompt the user sees for this input
            .setLabel("What book is this spoiler for?")
            // Short means only a single line of text
            .setStyle(TextInputStyle.Short);

        const spoilerInput = new TextInputBuilder()
            .setCustomId('spoilerInput')
            .setLabel("Spoiler:")
            // Paragraph means multiple lines of text.
            .setStyle(TextInputStyle.Paragraph);

        // An action row only holds one text input,
        // so you need one action row per text input.
        const firstActionRow = new ActionRowBuilder().addComponents(bookTitleInput);
        const secondActionRow = new ActionRowBuilder().addComponents(spoilerInput);

        // Add inputs to the modal
        modal.addComponents(firstActionRow, secondActionRow);

		console.log("Before show modal");

        // Show the modal to the user
        await message.showModal(modal);
    }
});

client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isModalSubmit()) return;

	// Get the data entered by the user
	const bookTitle = interaction.fields.getTextInputValue('bookTitleInput');
	const spoiler = interaction.fields.getTextInputValue('spoilerInput');
	console.log({ bookTitle, spoiler });
});