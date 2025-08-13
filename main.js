const fs = require('node:fs');
const path = require('node:path');
const { Client, GatewayIntentBits, Events, Collection, ActivityType } = require('discord.js');
const botSettings = require('./botSettings.json');
const { streamingEmbed, offlineStreamingEmbed } = require('./utils/streamingEmbed');
const { vStreamStreamEmbedMsg, vStreamOfflineEmbedMsg } = require('./utils/vStreamStreamingEmbed');
const { getGuildSetting, getAllGuildSettings } = require('./utils/getGuildSettings');
const { setGuildSetting } = require('./utils/setGuildSetting');
const { getStreamMessages, writeStreamMessages } = require('./utils/streamMessages');
const { log } = require('./utils/log');
const version = require('./package.json').version;
const { getClipList, addClip } = require('./utils/clipList');
const { getTwichClips, getStreamInfo } = require('./utils/twitchApi');
const { getVStreamStreamInfo, refreshVStreamToken } = require('./utils/vStreamAPI');
const { checkTwitchConnection } = require('./utils/checkTwitchConnection');
const updateColonyMentionHandler = require('./commands/updateColony');
const createColonyMentionHandler = require('./commands/createcolony');
const editColonyMentionHandler = require('./commands/editColony');
const deleteColonyMentionHandler = require('./commands/deleteColony');

const client = new Client({intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]});

client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

var twitchEnabled = true;
var vStreamEnabled = false;

var cleanupStreamEmbedsTimer;
var refreshVStreamTokenTimer;
var logChannel = null;
var clipsCheckTime = 60*60000; // default to 1 hour
var clipsChecker; 
var checkTwitchConnectionInterval;
var checkStreamsTimer;
var streamMessages = {};

async function cleanupStreamEmbeds() {
    // TODO - change this to support all platforms. use the update function? add stream platform to json
    streamMessages = await getStreamMessages();
    for(let x in streamMessages) {
        try {
            if(streamMessages[x].streamUsername !== undefined) {
                if(streamMessages[x].streamPlatform === 'twitch') {
                    if(twitchEnabled) {
                        const isChannelLive = await getStreamInfo(streamMessages[x].streamUsername);
                        if(isChannelLive === undefined) { // twitch API doesn't send a message if stream is offline. this is messy. 
                            log('info', logChannel, `Stream ${streamMessages[x].streamUsername} is offline. Changing message to offline embed.`);            
                            const offlineStreamingEmbedMsg = await offlineStreamingEmbed(streamMessages[x].streamUsername, streamMessages[x].discordUsername);
                            try {
                                const cleanupGuild = client.guilds.resolve(streamMessages[x].guildId);
                                const cleanupGuildChannelId = client.channels.resolveId(streamMessages[x].msgId.channelId); // not needed. prevents crash if the channel is deleted. 
                                const cleanupChannelManager = cleanupGuild.channels;
                                const cleanupMsgChannel = cleanupChannelManager.resolve(streamMessages[x].msgId.channelId);
                                const cleanupMsgId = await cleanupMsgChannel.fetch(streamMessages[x].msgId.id); // not needed. prevents crash if the message is deleted.                         
                                await cleanupMsgChannel.messages.edit(streamMessages[x].msgId.id, {embeds: [offlineStreamingEmbedMsg]});
                            }
                            catch(error) { log('error', logChannel, `Error cleaning up streaming message. ${error}`); }
                            delete streamMessages[x];
                        }
                        else { log('info', logChannel, `Channel ${streamMessages[x].streamUsername} is still live. Moving to next object in list.`); }
                    }
                    else { console.log('twitch disabled. Skipping.'); }
                }
                if(streamMessages[x].streamPlatform === 'vStream') {
                    // TODO - this assumes the token is valid which is a bad fucking idea ¯\_(ツ)_/¯
                    if(vStreamEnabled) {
                        const isChannelLive = await getVStreamStreamInfo(streamMessages[x].streamUsername);              
                        if(isChannelLive === null) { // this does not work like twitch
                            log('info', logChannel, `Stream ${streamMessages[x].streamUsername} is offline. Changing message to offline embed.`);            
                            const offlineStreamingEmbedMsg = await vStreamOfflineEmbedMsg(streamMessages[x].streamUsername);
                            try {
                                const cleanupGuild = client.guilds.resolve(streamMessages[x].guildId);
                                const cleanupGuildChannelId = client.channels.resolveId(streamMessages[x].msgId.channelId); // not needed. prevents crash if the channel is deleted. 
                                const cleanupChannelManager = cleanupGuild.channels;
                                const cleanupMsgChannel = cleanupChannelManager.resolve(streamMessages[x].msgId.channelId);
                                const cleanupMsgId = await cleanupMsgChannel.fetch(streamMessages[x].msgId.id); // not needed. prevents crash if the message is deleted.                         
                                await cleanupMsgChannel.messages.edit(streamMessages[x].msgId.id, {embeds: [offlineStreamingEmbedMsg]});
                            }
                            catch(error) { log('error', logChannel, `Error cleaning up streaming message. ${error}`); }
                            delete streamMessages[x];
                        }
                        else { log('info', logChannel, `Channel ${streamMessages[x].streamUsername} is still live. Moving to next object in list.`); }                    
                    }
                    else { console.log('vStream disabled. Skipping'); }
                }
            }
        }
        catch(error) { console.log(error); }
    }   
    await writeStreamMessages(streamMessages);
    streamMessages = await getStreamMessages();
}

async function checkMessageExists(channel, messageId) {
    try {
        const message = await channel.messages.fetch(messageId);
        return true; 
    } catch (error) {
        return false; 
    }
}

async function updateStreamEmbeds(streamUsername,guildSettings,guildId,msgChannel,streamEmbedMsg,streamPlatform) { // TODO - rename this function 
    let foundMessage = false;
    let searchMessageId = `${guildId}-${streamUsername}-${streamPlatform}`; // TODO - use this for activity ID below
    for(const key in streamMessages) {
        if(key == searchMessageId) {
            let embedMsgContent = ``;
            let roleMention = ``;
            const messageExists = await checkMessageExists(msgChannel,streamMessages[key].msgId.id);
            if(messageExists) {
                if(guildSettings.roleToPing !== undefined && guildSettings.roleToPing !== 'none') {
                    // roleMention = await g.roles.fetch(guildSettings.roleToPing);
                    // roleMention = await guildId.roles.fetch(guildSettings.roleToPing);                
                    let findGuild = await client.guilds.fetch(guildId);
                    roleMention = await findGuild.roles.fetch(guildSettings.roleToPing);
                    embedMsgContent = `${roleMention}`;
                    msgChannel.messages.edit(streamMessages[key].msgId.id, {
                        content: `${roleMention}`,
                        embeds: [streamEmbedMsg],
                        allowedMentions: {roles: [roleMention.id]}
                    });                                    
                }
                else { msgChannel.messages.edit(streamMessages[key].msgId.id, {embeds: [streamEmbedMsg]}); }                                
                let updatedMsgLog = `Updated activity (${guildId}-${streamUsername}-${streamPlatform}) message`;
                console.log(updatedMsgLog);
                log('info', logChannel, updatedMsgLog);
                foundMessage = true;
            } else { 
                let updatedMsgLog = `Error finding message for activity (${guildId}-${streamUsername}-${streamPlatform}) message`;
                console.log(updatedMsgLog);
                log('error', logChannel, updatedMsgLog);                
                // TODO - delete from stream messages object?
            }
        }
    }
    if(!foundMessage){
        let embedMsgContent = ``;
        let roleMention = ``;
        if(guildSettings.roleToPing !== undefined && guildSettings.roleToPing !== 'none') {
            // roleMention = await g.roles.fetch(guildSettings.roleToPing);
            // roleMention = await guildId.roles.fetch(guildSettings.roleToPing);                
            let findGuild = await client.guilds.fetch(guildId);
            roleMention = await findGuild.roles.fetch(guildSettings.roleToPing);
            embedMsgContent = `${roleMention}`;
            const streamingMsgId = await msgChannel.send({
                content: `${roleMention}`,
                embeds: [streamEmbedMsg],
                allowedMentions: {roles: [roleMention.id]}
            });
            let activityId = `${guildId}-${streamUsername}-${streamPlatform}`;
            streamMessages[activityId] = {
                activityId: activityId,
                guildId: guildId,
                msgId: streamingMsgId,
                streamUsername: streamUsername,
                discordUsername: streamUsername,
                streamPlatform: streamPlatform
            };                                
        }
        else {
            const streamingMsgId = await msgChannel.send({embeds: [streamEmbedMsg]});
            let activityId = `${guildId}-${streamUsername}-${streamPlatform}`; // TODO - set this to a variable and add date to id? 
            streamMessages[activityId] = {
                activityId: activityId,
                guildId: guildId,
                msgId: streamingMsgId,
                streamUsername: streamUsername,
                discordUsername: streamUsername,
                streamPlatform: streamPlatform
            };
        }                                                                                                 
        let addedMsgLog = `Added activity (${guildId}-${streamUsername}-${streamPlatform}) message to list`;
        console.log(addedMsgLog);
        log('info', logChannel, addedMsgLog);        
    }
}

async function checkStreams() {
    try {
        client.guilds.cache.forEach(async(g) => {
            const guildSettings = await getAllGuildSettings(g.id);
            console.log(`Checking streams for guild ${g.id}`);
            // twitch
            if(guildSettings.twitchStreams !== undefined && guildSettings.notificationChannelId !== undefined) { // TODO - change to truthy?
                for(let i = 0; i < guildSettings.twitchStreams.length; i++) {
                    if(twitchEnabled) { 
                        console.log(`[twitch]Checking stream ${guildSettings.twitchStreams[i]}`);
                        const twitchStreamOnline = await getStreamInfo(guildSettings.twitchStreams[i]);
                        if(twitchStreamOnline !== undefined) {
                            try { 
                                // if(botSettings.twitchToken == undefined || botSettings.twitchToken === null || botSettings.twitchToken.length < 5) {
                                //     throw "Twitch token in bot settings invalid";
                                // }
                                const actChannelManager = g.channels;
                                const msgChannel = actChannelManager.resolve(guildSettings.notificationChannelId);
                                let activityUsername = guildSettings.twitchStreams[i]; // TODO - remove this now that it's not using activity 
                                const twitchEmbedMsg = await streamingEmbed(guildSettings.twitchStreams[i], activityUsername);
                                if(twitchEmbedMsg !== undefined && msgChannel !== undefined) {
                                    if(msgChannel !== null) { // TODO - make this a function to use with other services
                                        // let foundMessage = false;
                                        // let searchMessageId = `${g.id}-${guildSettings.twitchStreams[i]}`;
                                        // for(const key in streamMessages) {
                                        //     if(key == searchMessageId) {
                                        //         let embedMsgContent = ``;
                                        //         let roleMention = ``;
                                        //         if(guildSettings.roleToPing !== undefined && guildSettings.roleToPing !== 'none') {
                                        //             roleMention = await g.roles.fetch(guildSettings.roleToPing);
                                        //             embedMsgContent = `${roleMention}`;
                                        //             msgChannel.messages.edit(streamMessages[key].msgId.id, {
                                        //                 content: `${roleMention}`,
                                        //                 embeds: [twitchEmbedMsg],
                                        //                 allowedMentions: {roles: [roleMention.id]}
                                        //             });                                    
                                        //         }
                                        //         else { msgChannel.messages.edit(streamMessages[key].msgId.id, {embeds: [twitchEmbedMsg]}); }                                
                                        //         let updatedMsgLog = `Updated activity (${g.id}-${guildSettings.twitchStreams[i]}) message`;
                                        //         console.log(updatedMsgLog);
                                        //         log('info', logChannel, updatedMsgLog);
                                        //         foundMessage = true;
                                        //     }
                                        // }
                                        // if(!foundMessage){
                                        //     let embedMsgContent = ``;
                                        //     let roleMention = ``;
                                        //     if(guildSettings.roleToPing !== undefined && guildSettings.roleToPing !== 'none') {
                                        //         roleMention = await g.roles.fetch(guildSettings.roleToPing);
                                        //         embedMsgContent = `${roleMention}`;
                                        //         const streamingMsgId = await msgChannel.send({
                                        //             content: `${roleMention}`,
                                        //             embeds: [twitchEmbedMsg],
                                        //             allowedMentions: {roles: [roleMention.id]}
                                        //         });
                                        //         let activityId = `${g.id}-${guildSettings.twitchStreams[i]}`;
                                        //         streamMessages[activityId] = {
                                        //             activityId: activityId,
                                        //             guildId: g.id,
                                        //             msgId: streamingMsgId,
                                        //             twitchUsername: guildSettings.twitchStreams[i],
                                        //             discordUsername: activityUsername
                                        //         };                                
                                        //     }
                                        //     else {
                                        //         const streamingMsgId = await msgChannel.send({embeds: [twitchEmbedMsg]});
                                        //         let activityId = `${g.id}-${guildSettings.twitchStreams[i]}`; // TODO - set this to a variable and add date to id? 
                                        //         streamMessages[activityId] = {
                                        //             activityId: activityId,
                                        //             guildId: g.id,
                                        //             msgId: streamingMsgId,
                                        //             twitchUsername: guildSettings.twitchStreams[i],
                                        //             discordUsername: activityUsername
                                        //         };
                                        //     }                                                                                                 
                                        //     let addedMsgLog = `Added activity (${g.id}-${guildSettings.twitchStreams[i]}) message to list`;
                                        //     console.log(addedMsgLog);
                                        //     log('info', logChannel, addedMsgLog);        
                                        // }
                                        await updateStreamEmbeds(guildSettings.twitchStreams[i],guildSettings,g.id,msgChannel,twitchEmbedMsg,'twitch');
                                    }
                                    await writeStreamMessages(streamMessages);
                                    streamMessages = await getStreamMessages();                              
                                }
                            }
                            catch(error) {
                                console.log(`Error creating streaming embed message: ${error}`);
                                log('error', logChannel, `Error creating streaming embed message: ${error}`);
                            } 
                        }         
                        else {
                            // stream is offline 
                            console.log(`[twitch]${guildSettings.twitchStreams[i]} is not streaming.`);
                        }
                    }
                    else { console.log('Twitch disabled. Skipping'); }
                }                                    
            }
            else { console.log(`twitchStreams or notificationChannelId not set in guild ${g}. Skipping`); }
            // // vStream
            if(vStreamEnabled) {
                if(guildSettings.vStreamStreams !== undefined && guildSettings.notificationChannelId !== undefined) {
                    for(let i = 0; i < guildSettings.vStreamStreams.length; i++) {
                        console.log(`[vstream]Checking stream ${guildSettings.vStreamStreams[i]}`);
                        const vStreamStreamOnline = await getVStreamStreamInfo(guildSettings.vStreamStreams[i]);
                        if(vStreamStreamOnline) {
                            try {
                                const actChannelManager = g.channels;
                                const msgChannel = actChannelManager.resolve(guildSettings.notificationChannelId);
                                let activityUsername = guildSettings.vStreamStreams[i]; // TODO - remove this now that it's not using activity 
                                const vStreamEmbedMsg = await vStreamStreamEmbedMsg(guildSettings.vStreamStreams[i], activityUsername);
                                if(vStreamEmbedMsg !== undefined && msgChannel !== undefined) {
                                    if(msgChannel !== null) {
                                        await updateStreamEmbeds(guildSettings.vStreamStreams[i],guildSettings,g.id,msgChannel,vStreamEmbedMsg,'vStream');                                        
                                    }
                                    await writeStreamMessages(streamMessages);
                                    streamMessages = await getStreamMessages();                                             
                                }

                            }
                            catch(error) {
                                console.log(`Error creating streaming embed message: ${error}`);
                                log('error', logChannel, `Error creating streaming embed message: ${error}`);
                            } 
                        }
                        else { console.log(`[vstream]${guildSettings.vStreamStreams[i]} is not streaming.`); }
                    }
                }
                else { console.log(`vStreamStreams or notificationChannelId not set in guild ${g}. Skipping`); }
            }
            else { console.log('vStream disabled. Skipping.'); }
        });            
    }
    catch(error) {
        console.log(error);
    }    
}

async function checkTwitchClips() {
    try {
        client.guilds.cache.forEach(async(g) => {
            const guildSettings = await getAllGuildSettings(g.id);
            if(guildSettings.twitchClipsChannel !== undefined && guildSettings.discordClipsChannel !== undefined) {
                let clipsResult = await getTwichClips(guildSettings.twitchClipsChannel);
                let clipsListFilename = `clipList-${g.id}`;
                const clipList = await getClipList(clipsListFilename);
                clipsResult.forEach(async (clip) => {
                    let foundClip = false;
                    if(clipList !== undefined) {
                        if(clipList.includes(clip.id)) {
                            console.log(`Found clip ${clip.id} in list, skipping.`);
                            log('info', logChannel, `Found clip ${clip.id} in list, skipping.`);
                            foundClip = true;
                        }
                    }
                    if(!foundClip) {
                        await addClip(clipsListFilename, clip.id);
                        const discordClipsChannel = client.channels.resolve(guildSettings.discordClipsChannel);                        
                        discordClipsChannel.send(`${clip.url}`);
                    }
                });
            }
            else { 
                console.log(`No clips settings found for guild ${g.id}, skipping.`);
            }
        });
    }
    catch(error) {
        console.log(error);
    }    
}

// run node deployCommands.js if adding any commands

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    if('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
    }
    else {
        console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
}

client.once('ready', async () => {
    console.log(`${client.user.username} connected`);
    if(botSettings.activity !== undefined) {
        client.user.setActivity( `${botSettings.activity} | ${version}`, {type: ActivityType.Watching});
    }
    if(botSettings.logChannel.length > 1) {
        logChannel = client.channels.resolve(botSettings.logChannel);    
        console.log(`Found log channel ${logChannel}`);
        let startMsg = ':robot: Bot started';
        if(botSettings.botIcon) { startMsg = `${botSettings.botIcon} Bot started`; }
        await logChannel.send(startMsg);
        await logChannel.send(`:grey_question: Twitch uses refresh token, skipping check.`);
    }
    else { console.log(`Log channel not set, skipping lookup`); }    
    if(botSettings.checkTwitchClips) {
        clipsCheckTime = botSettings.clipsCheckTime*60000;
        clipsChecker = setInterval(checkTwitchClips,clipsCheckTime);        
        // if(botSettings.discordClipsChannel.length > 1) {
            // discordClipsChannel = client.channels.resolve(botSettings.discordClipsChannel);
            // console.log(`Found clips channel ${discordClipsChannel}`);
            // clipsCheckTime = botSettings.clipsCheckTime*60000;
            // clipsChecker = setInterval(checkTwitchClips,clipsCheckTime);
        // }
        // else { console.log(`Twitch clips channel not set, skipping lookup`); }    
    }    
    streamMessages = await getStreamMessages();    
    
    // timers

    // cleanupStreamEmbedsTimer = setInterval(cleanupStreamEmbeds,1*40000); // 40 seconds
    cleanupStreamEmbedsTimer = setInterval(cleanupStreamEmbeds,10*60000); // 10 minutes (10*60000)
    
    // checkStreamsTimer = setInterval(checkStreams,1*30000); // 30 seconds (1*10000)
    checkStreamsTimer = setInterval(checkStreams,10*60000); // 10 minutes (10*60000) 
    
});

client.login(botSettings.discordToken);

client.on(Events.InteractionCreate, async interaction => {
    if(!interaction.isChatInputCommand()) return;
    // console.log(interaction);
    
    const command = interaction.client.commands.get(interaction.commandName);

    if(!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }

    try {
        await command.execute(interaction);
    }
    catch(error) {
        console.error(error);
        if(interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
        }
        else {
            await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
    }
});

client.on(Events.MessageCreate, async message => {
    await createColonyMentionHandler(message, client);
    await updateColonyMentionHandler(message, client);
    await editColonyMentionHandler(message, client);
    await deleteColonyMentionHandler(message, client);
});

