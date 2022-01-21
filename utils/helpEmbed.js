const { MessageEmbed, Util } = require('discord.js');

async function helpEmbed(requestedBy){
    try {
        const helpEmbed = new MessageEmbed()
        .setColor('#ffff00')
        // .setTitle('Help')
        .setDescription('Mention me with one of the commands below')
        .addFields(
            { name: 'help',value: 'Displays this message.'},
            { name: 'invite', value: 'Send URL to add me to your Discord server.'},
            { name: '\u200B', value: '\u200B' },
            { name: 'Stream Notifications', value: `**set live channel #<channel>**
            Sets the channel to send notifications when users go live on twitch.
            **set live role @<role>/off**
            Role to mention in stream notification messages.
            **off** disables role mentions in stream notification messages.
            **set live user @<user>/all/off**
            The discord user to watch for streaming activity. This user will need to have twitch linked with their discord account.
            **all** will send a notification for all users.
            **off** disables steam notification messages.`},
            { name: '\u200B', value: '\u200B' },
            { name: 'Clips', value: `**set clips channel**
            Discord channel to send notification messages when a new clip is created on twitch. 
            **set clips user**
            Twitch channel name to watch for new clips. 
            **set clips off**
            Disable twitch clip notification messages.`}
        )
        .setFooter(`Requested by ${requestedBy}`);

        return helpEmbed;
    }
    catch(error) {
        console.log(`Error creating help embed: ${error})`);
    }

}

module.exports.helpEmbed = helpEmbed;
// Mention me with one of the commands below.


// **Stream Notifications**
// **set live channel #<channel>**: Sets the channel to send notifications when users go live on twitch.
// **set live role @<role>**: Role to mention in stream notification messages.
// **set live role off**: Disable role mentions in stream notification messages.
// **set live user @<user>**: The discord user to watch for streaming activity. This user will need to have twitch linked with their discord account.
// **set live user all**: Send stream notification messages for all users in this server. 
// **set live user off**: Disable stream notification messages.

// **Clips**
// **set clips channel**: Discord channel to send notification messages when a new clip is created on twitch. 
// **set clips user**: Twitch channel name to watch for new clips. 
// **set clips off**: Disable twitch clip notification messages.