const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { setGuildSetting } = require('../utils/setGuildSetting');
const { getGuildSetting } = require('../utils/getGuildSettings');
const { getTwitchUserInfo } = require('../utils/twitchApi');
const botSettings = require('../botSettings.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('twitch')
        .setDescription('Change Twitch stream notification settings')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a Twitch channel to the live notification watch list')
                .addStringOption(option =>
                    option.setName('username')
                        .setDescription('Twitch username (not the full URL)')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a Twitch channel from the live notification watch list')
                .addStringOption(option =>
                    option.setName('username')
                        .setDescription('Twitch username (not the full URL)')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('channel')
                .setDescription('Set the Discord channel used for live notifications')
                .addChannelOption(option =>
                    option.setName('discordchannel')
                        .setDescription('Discord channel to send stream notifications')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('role')
                .setDescription('Set the role to mention in live notifications (also enables mentions)')
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('Role to mention')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('mentions')
                .setDescription('Enable or disable role mentions in live notifications')
                .addBooleanOption(option =>
                    option.setName('enabled')
                        .setDescription('Enable or disable role mentions')
                        .setRequired(true)))
        .setDefaultMemberPermissions(PermissionFlagsBits.MANAGE_GUILD)
        ,
    async execute(interaction) {
        if(interaction.user.id != interaction.guild.ownerId) {
            if(interaction.user.id != botSettings.botOwnerID) {
                await interaction.reply({content: `Command restricted to guild or bot owner.`, flags: MessageFlags.Ephemeral});
                return;
            }
        }

        const guildId = interaction.guild.id;
        const subcommand = interaction.options.getSubcommand();

        if(subcommand === 'add') {
            const twitchStream = interaction.options.getString('username');
            if(twitchStream.length > 4) {
                const twitchUserCheck = await getTwitchUserInfo(twitchStream);
                if(twitchUserCheck !== undefined) {
                    let twitchStreamsList = await getGuildSetting(guildId, 'twitchStreams');
                    if(twitchStreamsList) {
                        if(twitchStreamsList.includes(twitchStream)) {
                            let returnMsg = `:warning: ${twitchUserCheck.display_name} already exists in streams list`;
                            console.log(returnMsg);
                            await interaction.reply({ content: returnMsg, flags: MessageFlags.Ephemeral});
                        }
                        else {
                            twitchStreamsList.push(twitchStream);
                            let returnMsg = `:white_check_mark: ${twitchUserCheck.display_name} added to list \nhttps://twitch.tv/${twitchUserCheck.display_name}`;
                            console.log(returnMsg);
                            const streamNotificationChannel = await getGuildSetting(guildId,'notificationChannelId');
                            if(streamNotificationChannel) {
                                await interaction.reply({ content: returnMsg, flags: MessageFlags.Ephemeral});
                            }
                            else {
                                await interaction.reply({ content: `${returnMsg} \nHint: Use /twitch channel to set a channel for live notifications.`, flags: MessageFlags.Ephemeral});
                            }
                        }
                    }
                    else {
                        console.log(`twitchStreams does not exist in guild settings for ${guildId}`);
                        twitchStreamsList = [twitchStream];
                        await interaction.reply({ content: `:white_check_mark: ${twitchUserCheck.display_name} added to list \nHint: Use /twitch channel to set a channel for live notifications. \nhttps://twitch.tv/${twitchUserCheck.display_name}`, flags: MessageFlags.Ephemeral});
                    }
                    await setGuildSetting(guildId, 'twitchStreams', twitchStreamsList);
                    console.log(`Updated twitchStreams for guild ${guildId} to ${twitchStreamsList}`);
                }
                else {
                    let returnMsg = `:no_entry_sign: ${twitchStream} is not a valid twitch user`;
                    console.log(returnMsg);
                    await interaction.reply({ content: returnMsg, flags: MessageFlags.Ephemeral});
                }
            }
            else {
                let returnMsg = ':warning: twitch username must be at least 5 characters';
                console.log(returnMsg);
                await interaction.reply({ content: returnMsg, flags: MessageFlags.Ephemeral});
            }
        }

        else if(subcommand === 'remove') {
            const removeTwitchStream = interaction.options.getString('username');
            if(removeTwitchStream.length > 4) {
                let twitchStreamsList = await getGuildSetting(guildId, 'twitchStreams');
                if(twitchStreamsList && twitchStreamsList.includes(removeTwitchStream)) {
                    const index = twitchStreamsList.indexOf(removeTwitchStream);
                    twitchStreamsList.splice(index, 1);

                    let returnMsg = `:white_check_mark: ${removeTwitchStream} removed from list`;
                    console.log(returnMsg);
                    await interaction.reply({ content: returnMsg, flags: MessageFlags.Ephemeral});
                    await setGuildSetting(guildId, 'twitchStreams', twitchStreamsList);
                    console.log(`Updated twitchStreams for guild ${guildId} to ${twitchStreamsList}`);
                }
                else {
                    let returnMsg = `:warning: ${removeTwitchStream} is not in list`;
                    console.log(returnMsg);
                    await interaction.reply({ content: returnMsg, flags: MessageFlags.Ephemeral});
                }
            }
            else {
                let returnMsg = ':warning: twitch username must be at least 5 characters';
                console.log(returnMsg);
                await interaction.reply({ content: returnMsg, flags: MessageFlags.Ephemeral});
            }
        }

        else if(subcommand === 'channel') {
            const discordChannel = interaction.options.getChannel('discordchannel');
            let testMsg = `:white_check_mark: Test`;
            if(botSettings.botIcon) { testMsg = `${botSettings.botIcon}`; }
            try {
                await discordChannel.send(testMsg);
                await setGuildSetting(guildId, 'notificationChannelId', discordChannel.id);
                await interaction.reply({ content: `:white_check_mark: Set stream live notifications channel to ${discordChannel} (ID: ${discordChannel.id}) \nTest message sent to channel.`, flags: MessageFlags.Ephemeral});
                console.log(`Set stream notifications channel for guild ${guildId} to ${discordChannel.id}`);
            }
            catch(error) {
                let testMsgError = `Error setting stream notification channel to ${discordChannel} (${discordChannel.id}) in guild ${guildId}. \n${error}`;
                console.log(testMsgError);
                await interaction.reply({ content: testMsgError, flags: MessageFlags.Ephemeral});
            }
        }

        else if(subcommand === 'role') {
            const mentionRole = interaction.options.getRole('role');
            await setGuildSetting(guildId, 'mentionRoleId', mentionRole.id);
            await setGuildSetting(guildId, 'roleToPing', mentionRole.id);
            await interaction.reply({ content: `:white_check_mark: Set ${mentionRole} to live notifications mention role`, flags: MessageFlags.Ephemeral});
            console.log(`Set ${mentionRole} to live notifications mention role for guild ${guildId}`);
        }

        else if(subcommand === 'mentions') {
            const mentionEnabled = interaction.options.getBoolean('enabled');

            if(mentionEnabled) {
                const mentionRoleId = await getGuildSetting(guildId, 'mentionRoleId');
                if(mentionRoleId) {
                    await setGuildSetting(guildId, 'roleToPing', mentionRoleId);
                    console.log(`Enabled mentions for guild ${guildId}.`);
                    await interaction.reply({ content: ':white_check_mark: Enabled role mentions', flags: MessageFlags.Ephemeral});
                }
                else {
                    await interaction.reply({ content: `:warning: No mention role set yet. Use /twitch role to set one.`, flags: MessageFlags.Ephemeral});
                }
            }
            else {
                await setGuildSetting(guildId, 'roleToPing', 'none');
                console.log(`Disabled mentions for guild ${guildId}.`);
                await interaction.reply({ content: ':white_check_mark: Disabled role mentions', flags: MessageFlags.Ephemeral});
            }
        }
    },
};
