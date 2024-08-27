const { Events } = require('discord.js');

// The name property states which event this file is for
// the once property holds a boolean value that specifies if the event should run only once
// The execute function holds your event logic, which will be called by the event handler whenever the event emits.
module.exports = {
	name: Events.ClientReady,
	once: true,
    // When the client is ready, run this code (only once).
    // The distinction between `client: Client<boolean>` and `readyClient: Client<true>` is important for TypeScript developers.
    // It makes some properties non-nullable.
	execute(client) {
		console.log(`Ready! Logged in as ${client.user.tag}`);
	},
};