const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { helpEmbed } = require('../utils/helpEmbed');
const fs = require('node:fs');
const path = require('node:path');

// Commands that shouldn't be offered as a /help detail lookup (bot-wide/owner-only settings, or help itself)
const excludedFromChoices = ['help', 'sipa'];

const commandChoices = fs.readdirSync(__dirname)
    .filter(file => file.endsWith('.js') && file !== path.basename(__filename))
    .map(file => require(path.join(__dirname, file)))
    .filter(command => command.data && !excludedFromChoices.includes(command.data.name))
    .map(command => ({ name: command.data.name, value: command.data.name }));

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Sipa commands')
        .addStringOption(option =>
            option.setName('command')
                .setDescription('Get detailed usage for a specific command')
                .addChoices(...commandChoices)),
    async execute(interaction) {
        const focusCommandName = interaction.options.getString('command');
        const helpMsg = await helpEmbed(interaction.client.commands, focusCommandName);
        await interaction.reply({embeds: [helpMsg], flags: MessageFlags.Ephemeral});
        return;
    },
};
