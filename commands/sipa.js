const { SlashCommandBuilder,PermissionFlagsBits, MessageFlags } = require('discord.js');
const botSettings = require('../botSettings.json');
const { checkTwitchConnection } = require('../utils/checkTwitchConnection');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sipa')
        .setDescription('Sipa Settings')
        .setDefaultMemberPermissions(PermissionFlagsBits.MANAGE_GUILD)        
        .addSubcommand(subcommand =>
            subcommand
                .setName('twitchtoken')
                .setDescription('Get Twitch token URL'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('twitchtokentest')
                .setDescription('Test Twitch token'))
        ,
    async execute(interaction) {
        if(interaction.user.id == botSettings.botOwnerID) {
            if(interaction.options.getSubcommand() === 'twitchtoken') {
                const tokenUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${botSettings.twitchClientId}&redirect_uri=https://acceptdefaults.com/twitch-oauth-token-generator/&response_type=token&scope=user:read:broadcast`;
                await interaction.reply({content: `<${tokenUrl}>`, flags: MessageFlags.Ephemeral});
                return;
            }
            if(interaction.options.getSubcommand() === 'twitchtokentest') {
                const twitchStatus = await checkTwitchConnection();
                let checkMsg = `Twitch token status: `;
                if(twitchStatus) { 
                    checkMsg += `:white_check_mark:`;
                }
                else { 
                    const tokenUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${botSettings.twitchClientId}&redirect_uri=https://acceptdefaults.com/twitch-oauth-token-generator/&response_type=token&scope=user:read:broadcast`;
                    checkMsg += `:no_entry_sign: Renew token <${tokenUrl}>`; 
                }
                await interaction.reply(checkMsg);
                return;
            }
        }
        else {
            await interaction.reply({content: `Command restricted to bot owner.`, flags: MessageFlags.Ephemeral});
            return;
        }
    },
};
