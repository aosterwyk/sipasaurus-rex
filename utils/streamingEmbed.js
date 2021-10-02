const { MessageEmbed, Util } = require('discord.js');
const twitchApi = require('./twitchApi');
const botSettings = require('../botSettings.json');

async function streamingEmbed(twitchUsername, msgAuthor) {
    try {
        const twitchId = await twitchApi.getChannelID(twitchUsername, botSettings.twitchClientId, botSettings.twitchToken);
        const twitchInfo = await twitchApi.getTwitchUserInfo(twitchId, botSettings.twitchClientId, botSettings.twitchToken);
        // const streamTitle = await twitchApi.getStreamTitle(twitchId, botSettings.twitchClientId, botSettings.twitchToken);
        // const streamGame = await twitchApi.getCurrentGame(twitchId, botSettings.twitchClientId, botSettings.twitchToken);
        const streamInfo = await twitchApi.getStreamInfo(twitchUsername, botSettings.twitchClientId, botSettings.twitchToken);
        // https://discordjs.guide/popular-topics/embeds.html#embed-preview 
        const timestamp = new Date(); 
        const timestampString = `${timestamp.getHours()}${timestamp.getMinutes()}${timestamp.getSeconds()}`; // add date to thumbnail url so it's not cached
        const thumbnailUrl = streamInfo.thumbnail_url.replace(`{width}x{height}.jpg`, `1920x1080.jpg#${timestampString}`);
        let streamTitle = Util.escapeMarkdown(streamInfo.title);

        const returnEmbed = new MessageEmbed()
        .setColor('#1EA8D7') // change this to use event color from channel info
        .setTitle(streamTitle)
        .setURL(`https://twitch.tv/${twitchInfo.display_name}`) // change this to get from chnanel info
        .setAuthor(`${msgAuthor} is live`)
        .setDescription(streamInfo.game_name)
        .setThumbnail(twitchInfo.profile_image_url)
        .setImage(thumbnailUrl) // change this to stream preview
        .setTimestamp()
        .setFooter(`Last updated`);
    
        return returnEmbed;
    }
    catch(error) { 
        console.log(error); 
        return undefined;
    }
}

module.exports.streamingEmbed = streamingEmbed;