// You'll be using the SlashCommandBuilder class to construct the command definitions.
const { SlashCommandBuilder, ThreadAutoArchiveDuration, MessageFlags } = require('discord.js');

// module.exports is how you export data in Node.js so that you can require() it in other files.
module.exports = {
    // data property provides the command definition shown above for registering to Discord
    data: new SlashCommandBuilder()
        .setName('spoiler')
        .setDescription('Posts spoiler in current channel and archives spoiler for later')
        .addStringOption(option =>
            option
                .setName('title')
                .setDescription('Title of the book')
                .setRequired(true))
        .addStringOption(option =>
            option
                .setName('spoiler')
                .setDescription('The book spoiler')
                .setRequired(true)),
    // Execute method contains the functionality to run from our event handler when the command is used
    async execute(interaction) {
        await interaction.reply({ content: 'Spoiler was submitted!', flags: MessageFlags.Ephemeral });
        
        let title = interaction.options.getString('title');
        // Figure out how to push this through to the same channel as a message sent by the user like the native spoiler command does
        let spoiler = interaction.options.getString('spoiler');

        console.log(`${title}: ${spoiler}`);

        // Get the spoiler-archive channel that should be pre-existing in the server
        const spoiler_archive = interaction.guild.channels.cache.find(i => i.name === 'spoiler-archive')

        // Search for a thread that matches what the user inputted as the title
        let thread = await spoiler_archive.threads.cache.find(x => x.name.toLowerCase() === title.toLowerCase());

        // TODO: not sure where to do it, but make sure to unarchive threads if they are archived. Test by making a thread, archiving it, and then using the slash command to send a new message there.

        // If the search was successful and an existing thread was found, skip to the end and send the spoiler message in that thread
        // else if the thread was not found, create a thread with the title of the book and send the message there
        if (thread) {
        } else {
            // Wrap in try catch, if the name of the thread does not work, catch the error
            thread = await spoiler_archive.threads.create({
                name: `${title}`,
                autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
                reason: `New spoilers were added about ${title}`,
            });
        }

        // TODO: color the persons username/capitalize it correctly
        thread.send(`${interaction.member.nickname}: \n||${spoiler}||`);
    },
};