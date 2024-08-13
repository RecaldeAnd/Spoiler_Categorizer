// You'll be using the SlashCommandBuilder class to construct the command definitions.
const { SlashCommandBuilder } = require('discord.js');

// module.exports is how you export data in Node.js so that you can require() it in other files.
module.exports = {
    // data property provides the command definition shown above for registering to Discord
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with Pong!'),
    // Execute method contains the functionality to run from our event handler when the command is used
    async execute(interaction) {
        await interaction.reply('Pong!');
    },
};