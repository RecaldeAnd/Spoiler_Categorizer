const { ApplicationCommandType, ContextMenuCommandBuilder, ThreadAutoArchiveDuration, StringSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
const non_book_roles = ["Book Buying Ban", "#1 Dark Age Jorker (before Austin)", "#1 Red Rising Jorker", "#1 Global Name of the Wind Hater", "#1 Global Iron Gold Hater", "Morbidly Curious", "Spoiler-Archivist", "Spoiler-Organizer", "@everyone"];

function removeNonBookRoles(all_roles) {
    all_roles = all_roles.filter(role => !non_book_roles.includes(role.name));
    return all_roles;
}

// This function is redundant and can be eliminated
function getCurrentReads(all_roles) {
    const book_roles = removeNonBookRoles(all_roles);
    print_array(book_roles, "Only User's Book Roles");
    return book_roles;
}

async function getTargetThread(spoiler_archive, title) {
    let target_thread = {};
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

    return target_thread;
}

// Get a peek into the spoiler to print with the "Posted!" message
function getSpoilerPeek(spoiler) {
    // Convert "interaction.targetMessage" into string
    let spoiler_string = `${spoiler}`

    // Set up default values
    let spoiler_peek      = "ERROR: Spoiler peek wasn't generated";
    let peek_array        = [];
    let elipse_or_nothing = '';
    let pre_censored_text = "";

    // Split spoiler around || to get 2 strings in an array that exclude ||
    let spoiler_split_around_censor = spoiler_string.split("||", 2);
    if (spoiler_split_around_censor[1] === undefined) {
        peek_array               = spoiler_split_around_censor[0].split(" ", 6);
    } else {
        pre_censored_text        = spoiler_split_around_censor[0];
        peek_array               = spoiler_split_around_censor[1].split(" ", 6); 
    }

    // Want 5 censored words, if there are 6 words replace 6th with "..." 
    if (peek_array.length > 5) {
        peek_array.pop();
        elipse_or_nothing = "...";
    }

    // Concates all strings in array and separates them with a space instead of default ","
    spoiler_peek = peek_array.join(" ");

    return `*${pre_censored_text}${spoiler_peek}${elipse_or_nothing}*`; // pre_censored_test and elipse_or_nothing could be empty by design
}

// Also return the segment of the spoiler for the message back to the user
function postSpoiler(author, pattern, spoiler, target_thread) {
    if (pattern.test(spoiler)) {
        target_thread.send(`${author}:\n${spoiler}`);
    } else {
        if (spoiler.content.endsWith("||")) {
            target_thread.send(`${author}:\n||${spoiler}`);
        } else {
            target_thread.send(`${author}:\n||${spoiler}||`);
        }
    }

    return getSpoilerPeek(spoiler);
}

async function getOrMakeSpoilerArchiveChannel(interaction) {
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

    return spoiler_archive;
}

// TODO: Add dm message from bot to explicitly tell the user that the thread was found or created
async function findOrCreateThreadByName(spoiler_archive, thread_name) {
    // Before we create a new thread, check that it doesn't already
    // exist. If it doesn't, then create it. Otherwise, return the existing thread.
    const local_threads = await spoiler_archive.threads.fetch();
    let found_thread = local_threads.threads.find(thread => thread.name.toLowerCase() === thread_name.toLowerCase());
    let target_thread = {};
    if (found_thread) {
        target_thread = found_thread;
    } else {
        target_thread = await spoiler_archive.threads.create({
            name: `${thread_name}`,
            autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
            reason: `New spoilers were added about ${thread_name} or its role was created`,
        });
    }

    return target_thread;
}

// function getDateRoleWasCreated(role) {
//     let role_creation_date = role.createdAt; // This access does not work... may need to use newest version of discord.js. Currently on 14.15.3
//     console.log(`${role.name} was created on ${role_creation_date}`);
// }

function print_array(array, title) {
    console.log(`${title}:`);
    for(var obj of array) {
        console.log(`${obj.name}`);
    }
}

module.exports = {removeNonBookRoles, getCurrentReads, getTargetThread, postSpoiler, getOrMakeSpoilerArchiveChannel, findOrCreateThreadByName, print_array};