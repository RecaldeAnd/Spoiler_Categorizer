const { ContextMenuCommandBuilder, ApplicationCommandType } = require('discord.js');

module.exports = {
	data: new ContextMenuCommandBuilder()
	.setName('User Information')
	.setType(ApplicationCommandType.User),
	async execute(interaction) {
        console.log(interaction);
    },

};