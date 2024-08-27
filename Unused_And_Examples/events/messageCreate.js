const { ActionRowBuilder, Events, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

// The name property states which event this file is for
// The execute function holds your event logic, which will be called by the event handler whenever the event emits.
module.exports = {
	name: Events.MessageCreate,
	async execute(interaction) {
        // Commenting this out because modals can only 

        // This regex checks if a message is a discord spoiler (text wrapped in ||||)
        const pattern = /\|\|(.*?)\|\|/gs;

        if (pattern.test(interaction.content)) {
            // Create the modal
            const modal = new ModalBuilder()
            .setCustomId('myModal')
            .setTitle('My Modal');

            // Add components to modal

            // Create the text input components
            const favoriteColorInput = new TextInputBuilder()
                .setCustomId('favoriteColorInput')
                // The label is the prompt the user sees for this input
                .setLabel("What's your favorite color?")
                // Short means only a single line of text
                .setStyle(TextInputStyle.Short);

            const hobbiesInput = new TextInputBuilder()
                .setCustomId('hobbiesInput')
                .setLabel("What's some of your favorite hobbies?")
                // Paragraph means multiple lines of text.
                .setStyle(TextInputStyle.Paragraph);

            // An action row only holds one text input,
            // so you need one action row per text input.
            const firstActionRow = new ActionRowBuilder().addComponents(favoriteColorInput);
            const secondActionRow = new ActionRowBuilder().addComponents(hobbiesInput);

            // Add inputs to the modal
            modal.addComponents(firstActionRow, secondActionRow);

            // Show the modal to the user
            await client.showModal(modal);
        }
	},
};