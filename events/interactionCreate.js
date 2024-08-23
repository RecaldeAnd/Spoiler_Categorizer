const { Events } = require('discord.js');

// The name property states which event this file is for
// The execute function holds your event logic, which will be called by the event handler whenever the event emits.
module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
		if (interaction.isChatInputCommand()) {

			const command = interaction.client.commands.get(interaction.commandName);

			if (!command) {
				console.error(`No command matching ${interaction.commandName} was found.`);
				return;
			}

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
		} else if (interaction.isUserContextMenuCommand()) {
			// Get the User's username from context menu
			const { username } = interaction.targetUser;
			console.log(username);
			console.log(interaction);
		}
	},
};