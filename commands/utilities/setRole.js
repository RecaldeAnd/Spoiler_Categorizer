const { ApplicationCommandType, ContextMenuCommandBuilder, ThreadAutoArchiveDuration, StringSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
const { getOrMakeSpoilerArchiveChannel, print_array, findOrCreateThreadByName} = require('../../helpers/helperLib');

module.exports = {
    data: new ContextMenuCommandBuilder()
        .setName('Set Role')
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

        // Get and filter server roles for book specific roles (and create role POJOs) - (set this up in the future so a random user could set channels to ignore, for now, hardcode the ones for your channel)
        let all_roles = await interaction.guild.roles.cache.map(role => ({
            id: role.id,
            name: role.name
        }));

        print_array(all_roles, "all_roles");
        let non_book_roles = ["Book Buying Ban", "#1 Dark Age Jorker (before Austin)", "#1 Red Rising Jorker", "#1 Global Name of the Wind Hater", "#1 Global Iron Gold Hater", "Morbidly Curious", "Spoiler-Archivist", "Spoiler-Organizer", "@everyone"];

        // Search for each role in the non_book_roles array and remove each of those roles from the all_roles array (this will likely empty MOST of the all_roles array everytime and honestly this is only useful for conveniently displaying a book someone else is currently reading)
        for (var avoid_role of non_book_roles) {
            let all_role_index = 0;
            while (all_roles.length > all_role_index) {
                // console.log(`Name from all roles of index: ${all_roles[all_role_index].name}`);
                if (avoid_role == all_roles[all_role_index].name) {
                    all_roles.splice(all_role_index, 1);
                    break;
                }

                all_role_index++;
            }
        }
        const book_roles = Array.from(all_roles);
        print_array(book_roles, "Book_roles");

        // Create select menu options from roles
        const options = book_roles.map(role => ({
            label: role.name, // what the user sees
            value: role.id // the value I will work with
        }));

        // If options is empty, add an option to avoid errors and prompt user to add book
        let placeholder_text = 'Select A Role (Book) 📚';
        if (options.length === 0) {
            options.push({
                label: 'CLICK ADD ROLE BUTTON',
                value: 'new_role'
            });

            placeholder_text = '🔽 CLICK ADD ROLE BUTTON 🔽'
        }

        // Create the select menu and the add book button
        const select_menu = new StringSelectMenuBuilder()
            .setCustomId('select_option')
            .setPlaceholder(placeholder_text)
            .addOptions(options);

        const add_role_button = new ButtonBuilder()
            .setCustomId('new_role')
            .setLabel('Add Role (Book)')
            .setStyle(ButtonStyle.Success);

        // For whatever reason, when you tried making 1 action row with both 
        // components, it triggered a width error with specifically the button
        const menu = new ActionRowBuilder()
            .addComponents(select_menu);

        const button = new ActionRowBuilder()
            .addComponents(add_role_button);

        // Send message with select menu and button as 2 different action rows
        let menu_message = await dm_channel.send({
            content: 'What role (book) do you want?',
            components: [menu, button]
        });

        // Promise ensures we wait until the variable is set before we use it.
        // resolve what we use to return a good value
        // reject is what we use to return an error
        // IF RETURNS, EITHER RETURNS A STRING THAT WILL CONVERT TO A POJO ROLE OR A REAL ROLE OBJECT FROM DISCORD.JS
        let target_role = await new Promise((resolve, reject) => {
            // the filter determines the messages that the collector will accept
            // The collector is a message listener
            const filter = i => i.user.id === user.id;
            const collector = dm_channel.createMessageComponentCollector({ filter, time: 30000 }); // 30 seconds

            // 'collect' is an event, thus on an event we recieve collected and
            // run the following lambda
            collector.on('collect', async collected => {
                if (collected.isButton()) {
                    // Right now this will always succeed but its good to have for future development changes
                    if (collected.customId === 'new_role') {
                        // Get rid of the previous message as it is no longer necessary
                        await menu_message.delete();
                        resolve(collected.customId); // return 'new_role'
                        
                        // Clean up
                        collector.stop();
                    }
                } else {
                    // Get the value selected and the role that it corresponds to
                    const selected_role_id = collected.values[0];
                    const role = interaction.guild.roles.cache.get(selected_role_id); // Could search through your POJO Role array because that is technically faster... this is just less code and visually cleaner

                    // If the role exists (and it really should at this point),
                    // return it with resolve() and update the menu message
                    if (role) {
                        await collected.update({ content: `You selected role: ${role.name}`, components: [] });

                        resolve(role);

                        // Clean up
                        collector.stop();
                    } else {
                        await collected.update({ content: 'Role not found ❌', components: [] });
                        reject(new Error('Role not found.'));
                        collector.stop();
                    }
                }
            });

            // Error handling if a response is not received in time
            collector.on('end', (collected, reason) => {
                if (reason === 'time') {
                    dm_channel.send('You did not select a role in time ⌛');
                    reject(new Error('You did not select a role in time.'));
                }
            });
        });

        // If the user clicked the "Add role" button, enter the branch
        if (typeof target_role === 'string' && target_role === 'new_role') {
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

            // Before we create a new role, check that it doesn't already
            // exist. If it doesn't, then create it. Otherwise, return the existing role.
            print_array(book_roles, "Book_roles");
            let found_role = book_roles.find(role => role.name.toLowerCase() === title.toLowerCase());
            if (found_role) {
                target_role = found_role; // This will set target_role to a chopped version of the official role obj that I made because its from the book_roles array
            } else {
                target_role = await interaction.guild.roles.create({
                    name: `${title}`,
                    color: 0x7b08ff     // Bluish-Purple hopefully
                });
            }
        }

        // Get the spoiler archive channel to make sure the role has a corresponding thread.
        // If there is not a corresponding thread, make the thread.
        const spoiler_archive = await getOrMakeSpoilerArchiveChannel(interaction);
        await findOrCreateThreadByName(spoiler_archive, target_role.name);

        // Add role to the user
        // console.log(`target_role: ${target_role}`);
        const member_promise = interaction.member.roles.add(target_role.id); // Need to explicitly send the id since it could be a POJO Role or the actual Discord.js Role
    
        dm_channel.send({
            content: `Role ${target_role.name} Assigned 🫡`,
            ephemeral: true
        });
    },
};