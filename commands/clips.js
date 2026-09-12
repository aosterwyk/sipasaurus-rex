const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { setGuildSetting } = require('../utils/setGuildSetting');
const botSettings = require('../botSettings.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clips')
        .setDescription('Twitch clips settings')
        .addSubcommand(subcommand =>
            subcommand
                .setName('enabled')
                .setDescription('Enable or disable posting new Twitch clips')
                .addBooleanOption(option =>
                    option.setName('value')
                        .setDescription('Enable or disable new clip posts')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('channel')
                .setDescription('Set the Discord channel used for new clip posts')
                .addChannelOption(option =>
                    option.setName('discordchannel')
                        .setDescription('The Discord channel to post new clips')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('twitchchannel')
                .setDescription('Set the Twitch channel to monitor for new clips')
                .addStringOption(option =>
                    option.setName('twitchchannel')
                        .setDescription('Twitch channel to monitor for new clips')
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

        const guildId = interaction.guildId;
        const subcommand = interaction.options.getSubcommand();

        if(subcommand === 'enabled') {
            const clipsEnabled = interaction.options.getBoolean('value');
            await setGuildSetting(guildId, 'checkTwitchClips', clipsEnabled);
            const replyMsg = clipsEnabled ? ':white_check_mark: Clip messages enabled' : ':white_check_mark: Clip messages disabled';
            console.log(`${clipsEnabled ? 'Enabled' : 'Disabled'} clips for guild ${guildId}`);
            await interaction.reply({ content: replyMsg, flags: MessageFlags.Ephemeral});
        }

        else if(subcommand === 'channel') {
            const clipsDiscordChannel = interaction.options.getChannel('discordchannel');
            await setGuildSetting(guildId, 'checkTwitchClips', true);
            await setGuildSetting(guildId, 'discordClipsChannel', clipsDiscordChannel.id);
            console.log(`Set clips channel for guild ${guildId} to ${clipsDiscordChannel.id}`);
            await interaction.reply({ content: `:white_check_mark: Set clips channel to ${clipsDiscordChannel}`, flags: MessageFlags.Ephemeral});
        }

        else if(subcommand === 'twitchchannel') {
            const clipsTwitchChannel = interaction.options.getString('twitchchannel');
            await setGuildSetting(guildId, 'twitchClipsChannel', clipsTwitchChannel);
            console.log(`Set clips user for guild ${guildId} to ${clipsTwitchChannel}`);
            await interaction.reply({ content: `:white_check_mark: Set twitch channel to https://twitch.tv/${clipsTwitchChannel}`, flags: MessageFlags.Ephemeral});
        }
    },
};
