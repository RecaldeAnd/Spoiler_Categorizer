const { Events } = require('discord.js');

// The name property states which event this file is for
// The execute function holds your event logic, which will be called by the event handler whenever the event emits.
module.exports = {
	name: Events.MessageCreate,
	async execute(interaction) {
        const pattern = /\|\|(.*?)\|\|/gs;
        // console.log(interaction.content);
        if (pattern.test(interaction.content)) {
            interaction.channel.send("This is a spoiler!"); // TODO: Figure out a way to send a ghost message to sender that let's them submit the book title. Then use the title, spoiler, and username to repost the spoiler in a thread in the spoiler channel
        }
	},
};