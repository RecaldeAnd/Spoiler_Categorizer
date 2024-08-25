const { ApplicationCommandType, ContextMenuCommandBuilder, ThreadAutoArchiveDuration, StringSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

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

        // Get the spoiler-archive channel that should be pre-existing in the server
        const spoiler_archive = interaction.guild.channels.cache.find(i => i.name === 'spoiler-archive')

        // Get all the active threads in the spoiler-archive channel
        const activeThreads = await spoiler_archive.threads.fetchActive();
        const activeThreadArray = Array.from(activeThreads.threads.values());
        for (var thread of activeThreadArray) {
            try {
                const messages = await thread.messages.fetch({ limit: 1 });
                const lastMessage = messages.first();
                thread.lastMessageAt = messages.first() ? lastMessage.createdAt : thread.createdAt;
                //console.log(`Thread Name: ${thread.name}, Last Message At: ${thread.lastMessageAt}`);
            } catch (error) {
                console.error(`Failed to fetch messages for thread ${thread.id}:`, error);
            }
        }

        const sortedActiveThreads = activeThreadArray.sort((a, b) => b.lastMessageAt - a.lastMessageAt);

        // Get all the archive threads in the spoiler-archive channel
        const archivedThreads = await spoiler_archive.threads.fetchArchived({
            limit: 100, // Adjust the limit as needed
            before: new Date() // Fetch threads before the current time
        });
        let archivedThreadsArray = Array.from(archivedThreads.threads.values());

        // Combine both thread lists into one list (the threadsArray in between may be redundant)
        const allThreads = [...sortedActiveThreads, ...archivedThreadsArray];

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

        const newThreadButton = new ButtonBuilder()
            .setCustomId('new_thread')
            .setLabel('Add Book')
            .setStyle(ButtonStyle.Primary);

        // For whatever reason, when you tried making 1 action row with both components, it triggered a width
        // error with specifically the button
        const menu = new ActionRowBuilder()
            .addComponents(selectMenu);

        const button = new ActionRowBuilder()
            .addComponents(newThreadButton);

        // Send message with select menu
        await dmChannel.send({
            content: 'What is the title of the book?',
            components: [menu, button],
        });

        // Await user's selection
        let target_thread = await new Promise((resolve, reject) => {
            const filter = i => i.user.id === user.id;
            const collector = dmChannel.createMessageComponentCollector({ filter, time: 30000 }); // 60 seconds

            collector.on('collect', async collected => {

                if (collected.isButton()) {
                    // Right now this will always succeed but its good to have for future development changes
                    if (collected.customId === 'new_thread') {
                        collected.update({ components: [] });
                        resolve(collected.customId);
                        // Clean up
                        collector.stop();
                    }
                } else {
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
                }
            });

            collector.on('end', (collected, reason) => {
                if (reason === 'time') {
                    dmChannel.send('You did not select a thread in time.');
                    reject(new Error('You did not select a thread in time.'));
                }
            });
        });

        if (typeof target_thread === 'string' && target_thread === 'new_thread') {
            let title = await new Promise((resolve, reject) => {
                const collectorFilter = m => interaction.user.id === m.author.id;
                dmChannel.send("Please enter the title of this new book/media:");

                dmChannel.awaitMessages({ filter: collectorFilter, time: 20_000, max: 1, errors: ['time'] })
                    .then(messages => {
                        resolve(messages.first().content);
                    })
                    .catch(() => {
                        dmChannel.send('You did not provide a response in time.');
                        reject(new Error('No response was provided in time'));
                    });
            });

            const local_threads = await spoiler_archive.threads.fetch();
            let found_thread = local_threads.threads.find(thread => thread.name === title);
            if (found_thread) {
                target_thread = found_thread;
            } else {
                target_thread = await spoiler_archive.threads.create({
                    name: `${title}`,
                    autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
                    reason: `New spoilers were added about ${title}`,
                });
            }
        }

        // TODO: color the persons username/capitalize it correctly
        // Check to see if the message is spoiler wrapped, if it isn't then make sure to wrap it... this may prove troublesome long term but its safer
        const author = interaction.targetMessage.author.username;
        const pattern = /\|\|(.*?)\|\|/gs;
        if (pattern.test(spoiler)) {
            target_thread.send(`${author}:\n${spoiler}`);
        } else {
            if (spoiler.content.endsWith("||")) {
                target_thread.send(`${author}:\n||${spoiler}`);
            } else {
                target_thread.send(`${author}:\n||${spoiler}||`);
            }
        }
        
        dmChannel.send({
            content: `Archived 🫡`,
            ephemeral: true
        });
    },
};