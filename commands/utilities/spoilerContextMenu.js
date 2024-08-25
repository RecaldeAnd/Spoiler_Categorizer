const { ApplicationCommandType, ContextMenuCommandBuilder, ThreadAutoArchiveDuration, StringSelectMenuBuilder, ActionRowBuilder } = require('discord.js');

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
        // await dmChannel.send('What is the title of the book?');

        // Get the spoiler-archive channel that should be pre-existing in the server
        const spoiler_archive = interaction.guild.channels.cache.find(i => i.name === 'spoiler-archive')

        // TODO: try to get the threads in order of most active to least active
        // Get all the active threads in the spoiler-archive channel
        const activeThreads = await spoiler_archive.threads.fetchActive();

        // Get all the archive threads in the spoiler-archive channel
        const archivedThreads = await spoiler_archive.threads.fetchArchived({
            limit: 100, // Adjust the limit as needed
            before: new Date() // Fetch threads before the current time
        });

        // Combine both thread lists into one list
        const allThreads = [...activeThreads.threads.values(), ...archivedThreads.threads.values()];
        const threadsArray = Array.from(allThreads);

        // Create select menu options from threads
        const options = allThreads.map(thread => ({
            label: thread.name,
            value: thread.id,
            description: `This is probably a book`
        }));

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('select_option')
            .setPlaceholder('Select an option')
            .addOptions(options);

        const row = new ActionRowBuilder()
            .addComponents(selectMenu);

        // Send message with select menu
        // TODO: Add a button here maybe that then asks for a new book title if one doesn't exist
        const response = await dmChannel.send({
            content: 'What is the title of the book?',
            components: [row],
        });

        // Await user's selection
        let target_thread = await new Promise((resolve, reject) => {
            const filter = i => i.user.id === user.id && i.customId === 'select_option';
            const collector = dmChannel.createMessageComponentCollector({ filter, time: 60_000 }); // 60 seconds

            collector.on('collect', async collected => {
                const selectedThreadId = collected.values[0];
                const thread = spoiler_archive.threads.cache.get(selectedThreadId);

                if (thread) {
                    await collected.update({ content: `You selected thread: ${thread.name}`, components: [] });

                    resolve(thread);

                    // Clean up
                    collector.stop();
                } else {
                    await collected.update({ content: 'Thread not found.', components: [] });
                    reject(new Error('Thread not found.'));
                }
            });

            collector.on('end', (collected, reason) => {
                if (reason === 'time') {
                    dmChannel.send('You did not select a thread in time.');
                    reject(new Error('You did not select a thread in time.'));
                }
            });
        });

        console.log(response);
        
        let new_book = false;
        if (new_book) {
            // ASSUMING THE OPTIONS WORKS OUT: Convert this to only run if the thread doesn't exist already
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

            target_thread = await spoiler_archive.threads.create({
                name: `${title}`,
                autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
                reason: `New spoilers were added about ${title}`,
            });
        }

        //console.log(`${title}: ${spoiler}`);

        // Search for a thread that matches what the user inputted as the title
        // let target_thread = await allThreads.cache.find(x => x.name.toLowerCase() === title.toLowerCase());

        // TODO: not sure where to do it, but make sure to unarchive threads if they are archived. Test by making a thread, archiving it, and then using the slash command to send a new message there.

        // If the search was successful and an existing thread was found, skip to the end and send the spoiler message in that thread
        // else if the thread was not found, create a thread with the title of the book and send the message there
        // if (target_thread) {
        // } else {
        //     // Wrap in try catch, if the name of the thread does not work, catch the error
        //     target_thread = await spoiler_archive.threads.create({
        //         name: `${title}`,
        //         autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
        //         reason: `New spoilers were added about ${title}`,
        //     });
        // }

        // TODO: color the persons username/capitalize it correctly
        // Spoiler is not wrapped in |||| because it is assumed they invoking this command on an already censor'd message
        target_thread.send(`${interaction.member.nickname}:\n${spoiler}`);
    },
};