// Make sure that the bot is higher than the book roles on the role hierarchy

const { ApplicationCommandType, ContextMenuCommandBuilder, ThreadAutoArchiveDuration, StringSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, MessageFlags } = require('discord.js');

module.exports = {
    data: new ContextMenuCommandBuilder()
        .setName('Remove Role')
        .setType(ApplicationCommandType.Message),
    async execute(interaction) {
        // Get the target spoiler message and let the user know to check their dms
        const spoiler = interaction.targetMessage;
        await interaction.reply({
            content: 'I\'ve slid into your dms... 😏',
            flags: MessageFlags.Ephemeral
        });
        

        // Setup to send a dm to user who activated the command
        const user = interaction.user;
        const dm_channel = await user.createDM();

        // Get and filter server roles for book specific roles (and create role POJOs) - (set this up in the future so a random user could set channels to ignore, for now, hardcode the ones for your channel)
        let all_user_roles = await interaction.member.roles.cache.map(role => ({
            id: role.id,
            name: role.name
        }));

        print_array(all_user_roles, "all_user_roles");
        let non_book_roles = ["Book Buying Ban", "#1 Dark Age Jorker (before Austin)", "#1 Red Rising Jorker", "#1 Global Name of the Wind Hater", "#1 Global Iron Gold Hater", "Morbidly Curious", "Spoiler-Archivist", "Spoiler-Organizer", "@everyone"];

        // Search for each role in the non_book_roles array and remove each of those roles from the all_user_roles array (this will likely empty MOST of the all_user_roles array everytime and honestly this is only useful for conveniently displaying a book someone else is currently reading)
        for (var avoid_role of non_book_roles) {
            let all_role_index = 0;
            while (all_user_roles.length > all_role_index) {
                // console.log(`Name from all roles of index: ${all_user_roles[all_role_index].name}`);
                if (avoid_role == all_user_roles[all_role_index].name) {
                    all_user_roles.splice(all_role_index, 1);
                    break;
                }

                all_role_index++;
            }
        }
        const book_roles = Array.from(all_user_roles);
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
                label: 'Go read a book',
                value: 'no_book_roles'
            });

            placeholder_text = 'There\'s nothing here goofy'
        }

        // Create the select menu and the add book button
        const select_menu = new StringSelectMenuBuilder()
            .setCustomId('select_option')
            .setPlaceholder(placeholder_text)
            .addOptions(options);

        // For whatever reason, when you tried making 1 action row with both 
        // components, it triggered a width error with specifically the button (deleted button for this interaction)
        const menu = new ActionRowBuilder()
            .addComponents(select_menu);

        // Send message with select menu and button as 2 different action rows
        let menu_message = await dm_channel.send({
            content: 'What role do you want to remove?',
            components: [menu]
        });

        // Promise ensures we wait until the variable is set before we use it.
        // resolve what we use to return a good value
        // reject is what we use to return an error
        // IF RETURNS, EITHER RETURNS A STRING THAT WILL CONVERT TO A POJO ROLE OR A REAL ROLE OBJECT FROM DISCORD.JS
        let target_role = await new Promise((resolve, reject) => {
            // the filter determines the messages that the collector will accept
            // The collector is a message listener
            const filter = i => i.user.id === user.id;
            const collector = dm_channel.createMessageComponentCollector({ filter, time: 20000 }); // 20 seconds

            // 'collect' is an event, thus on an event we recieve collected and
            // run the following lambda
            collector.on('collect', async collected => {
                // Get the value selected and the role that it corresponds to
                const selected_role_id = collected.values[0];
                const role = interaction.guild.roles.cache.get(selected_role_id); // This is copied from the setRole file, would be smarter to get the role details straight from the user's roles but... this is already written so 🤷🏽

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
            });

            // Error handling if a response is not received in time
            collector.on('end', (collected, reason) => {
                if (reason === 'time') {
                    dm_channel.send('You did not select a role in time ⌛');
                    reject(new Error('You did not select a role in time.'));
                }
            });
        });

        // Add role to the user
        // console.log(`target_role: ${target_role}`);
        const member_promise = interaction.member.roles.remove(target_role.id); // Need to explicitly send the id since it could be a POJO Role or the actual Discord.js Role
    
        dm_channel.send({
            content: `Role ${target_role.name} Removed 🫡`,
            flags: MessageFlags.Ephemeral
        });
    },
};

function print_array(array, title) {
    console.log(`${title}:`);
    for(var obj of array) {
        console.log(`${obj.name}`);
    }
}