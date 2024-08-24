const { ApplicationCommandType, ContextMenuCommandBuilder, ThreadAutoArchiveDuration } = require('discord.js');

module.exports = {
    data: new ContextMenuCommandBuilder()
        .setName('Archive Spoiler')
        .setType(ApplicationCommandType.Message),
    async execute(interaction) {
        const spoiler = interaction.targetMessage;
        const message = await interaction.reply({
            content: 'I\'ve slid into your dms... 😏',
            ephemeral: true
        });

        setTimeout(() => {
            message.delete().catch(console.error);
        }, 10000); // Time in milliseconds

        const user = interaction.user;
        const dmChannel = await user.createDM();
        // Ask for more information in DM
        await dmChannel.send('What is the title of the book?');

        let title = await new Promise((resolve, reject) => {
            const collectorFilter = m => interaction.user.id === m.author.id;

            dmChannel.awaitMessages({ filter: collectorFilter, time: 20_000, max: 1, errors: ['time'] })
                .then(messages => {
                    dmChannel.send(`Archived 🫡`);
                    resolve(messages.first().content);
                })
                .catch(() => {
                    dmChannel.send('You did not provide a response in time.');
                    reject(new Error('No response was provided in time'));
                });
        })

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
        // Spoiler is not wrapped in |||| because it is assumed they invoking this command on an already censor'd message
        thread.send(`${interaction.member.nickname}: \n${spoiler}`);
    },
};