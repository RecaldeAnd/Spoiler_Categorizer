const { ApplicationCommandType, ContextMenuCommandBuilder, ThreadAutoArchiveDuration, StringSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');

module.exports = {
    data: new ContextMenuCommandBuilder()
        .setName('Archive Spoiler')
        .setType(ApplicationCommandType.Message),
    async execute(interaction) {
        // Get the target spoiler message and let the user know to check their dms
        const spoiler = interaction.targetMessage;
        await interaction.reply({
            content: 'I\'ve slid into your dms... 😏',
            ephemeral: true
        });

        // Setup to send a dm to user who activated the command
        const user = interaction.user;
        const dm_channel = await user.createDM();

        // Get the spoiler-archive channel or create one if it doesn't exist
        let spoiler_archive = interaction.guild.channels.cache.find(i => i.name === 'spoiler-archive')

        if (spoiler_archive) {
        } else {
            let channel_options = {
                name: 'spoiler-archive', // Name of the new channel
                type: ChannelType.GuildText, // or 'GUILD_VOICE', 'GUILD_CATEGORY', etc.
                topic: 'This channel is for users to look through once they\'ve finished a book that other\'s have talked about', // Optional: Only for text channels
                reason: 'This bot needs a channel to send the spoilers into', // Optional: Reason for creating the channel
            };

            // This creates the channel with the above options. Consider only giving admins permissions here
            spoiler_archive = await new Promise((resolve, reject) => {
                let channel = interaction.guild.channels.create(channel_options);

                if (channel) {
                    resolve(channel);
                } else {
                    reject(new Error('Channel could not be created!'));
                }
            });
        }

        // Get all the active threads in the spoiler-archive channel
        const active_threads = await spoiler_archive.threads.fetchActive();
        const active_thread_array = Array.from(active_threads.threads.values());

        // Loop through active threads and set new property that holds the time
        // stamp of last message sent (or thread creation if not messages found).
        // Then sort on latest message time to order the list of threads by most
        // recently active.
        for (var thread of active_thread_array) {
            try {
                // Get latest message and get it's timestamp (.createdAt)
                const messages = await thread.messages.fetch({ limit: 1 });
                const lastMessage = messages.first();
                thread.lastMessageAt = messages.first() ? lastMessage.createdAt : thread.createdAt;
            } catch (error) {
                console.error(`Failed to fetch messages for thread ${thread.id}:`, error);
            }
        }
        const sorted_active_threads = active_thread_array.sort((a, b) => b.lastMessageAt - a.lastMessageAt);

        // Get all the archive threads in the spoiler-archive channel
        const archived_threads = await spoiler_archive.threads.fetchArchived({
            limit: 100, // Adjust the limit as needed
            before: new Date() // Fetch threads before the current time
        });
        let archived_threads_array = Array.from(archived_threads.threads.values());

        // Combine both thread lists into one list
        const all_threads = [...sorted_active_threads, ...archived_threads_array];

        // Create select menu options from threads
        const options = all_threads.map(thread => ({
            label: thread.name, // what the user sees
            value: thread.id // the value I will work with
        }));

        // If options is empty, add an option to avoid errors and prompt user to add book
        let placeholder_text = 'Select A Book 📚';
        if (options.length === 0) {
            options.push({
                label: 'CLICK ADD BOOK BUTTON',
                value: 'new_thread'
            });

            placeholder_text = '🔽 CLICK ADD BOOK BUTTON 🔽'
        }

        // Create the select menu and the add book button
        const select_menu = new StringSelectMenuBuilder()
            .setCustomId('select_option')
            .setPlaceholder(placeholder_text)
            .addOptions(options);

        const add_book_button = new ButtonBuilder()
            .setCustomId('new_thread')
            .setLabel('Add Book')
            .setStyle(ButtonStyle.Success);

        // For whatever reason, when you tried making 1 action row with both 
        // components, it triggered a width error with specifically the button
        const menu = new ActionRowBuilder()
            .addComponents(select_menu);

        const button = new ActionRowBuilder()
            .addComponents(add_book_button);

        // Send message with select menu and button as 2 different action rows
        let menu_message = await dm_channel.send({
            content: 'What is the title of the book?',
            components: [menu, button],
        });

        // Promise ensures we wait until the variable is set before we use it.
        // resolve what we use to return a good value
        // reject is what we use to return an error
        let target_thread = await new Promise((resolve, reject) => {
            // the filter determines the messages that the collector will accept
            // The collector is a message listener
            const filter = i => i.user.id === user.id;
            const collector = dm_channel.createMessageComponentCollector({ filter, time: 30000 }); // 30 seconds

            // 'collect' is an event, thus on an event we recieve collected and
            // run the following lambda
            collector.on('collect', async collected => {
                if (collected.isButton()) {
                    // Right now this will always succeed but its good to have for future development changes
                    if (collected.customId === 'new_thread') {
                        // Get rid of the previous message as it is no longer necessary
                        await menu_message.delete();
                        resolve(collected.customId); // return 'new_thread'
                        
                        // Clean up
                        collector.stop();
                    }
                } else {
                    // Get the value selected and the thread that it corresponds to
                    const selectedThreadId = collected.values[0];
                    const thread = spoiler_archive.threads.cache.get(selectedThreadId);

                    // If the thread exists (and it really should at this point),
                    // return it with resolve() and update the menu message
                    if (thread) {
                        await collected.update({ content: `You selected thread: ${thread.name}`, components: [] });

                        resolve(thread);

                        // Clean up
                        collector.stop();
                    } else {
                        await collected.update({ content: 'Thread not found ❌', components: [] });
                        reject(new Error('Thread not found.'));
                        collector.stop();
                    }
                }
            });

            // Error handling if a response is not received in time
            collector.on('end', (collected, reason) => {
                if (reason === 'time') {
                    dm_channel.send('You did not select a thread in time ⌛');
                    reject(new Error('You did not select a thread in time.'));
                }
            });
        });

        // If the user clicked the "Add book" button, enter the branch
        if (typeof target_thread === 'string' && target_thread === 'new_thread') {
            let title = await new Promise((resolve, reject) => {
                // the filter determines the messages that the collector will 
                // accept. We are waiting for the first message and returning
                const collectorFilter = m => interaction.user.id === m.author.id;
                dm_channel.send(`📝 Please enter the title of this new book/media:`);

                dm_channel.awaitMessages({ filter: collectorFilter, time: 20_000, max: 1, errors: ['time'] })
                    .then(messages => {
                        resolve(messages.first().content);
                    })
                    .catch(() => {
                        dm_channel.send('You did not provide a response in time ⌛');
                        reject(new Error('No response was provided in time'));
                    });
            });

            // Before we create a new thread, check that it doesn't already
            // exist. If it doesn't, then create it. Otherwise, return the existing thread.
            const local_threads = await spoiler_archive.threads.fetch();
            let found_thread = local_threads.threads.find(thread => thread.name.toLowerCase() === title.toLowerCase());
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
        // Check to see if the message is spoiler wrapped, if it isn't then make
        // sure to wrap it... this may prove troublesome long term but its safer
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
        
        dm_channel.send({
            content: `Archived 🫡`,
            ephemeral: true
        });
    },
};