const { EmbedBuilder, ApplicationCommandOptionType } = require('discord.js');
const version = require('../package.json').version;

// Commands that shouldn't show up in guild-facing help (bot-wide/owner-only settings, or help itself)
const excludedFromHelp = ['sipa', 'help'];

function formatOption(option) {
    const required = option.required ? ' (required)' : '';
    return `\`${option.name}\`${required} - ${option.description}`;
}

function subcommandsOf(data) {
    return (data.options || []).filter(option => option.type === ApplicationCommandOptionType.Subcommand);
}

function commandSummaryField(data) {
    const subcommands = subcommandsOf(data);
    if(subcommands.length > 0) {
        const subcommandNames = subcommands.map(sub => sub.name).join(', ');
        return { name: `/${data.name}`, value: `${data.description}\nSubcommands: ${subcommandNames}` };
    }
    return { name: `/${data.name}`, value: data.description || '​' };
}

function commandDetailFields(data) {
    const subcommands = subcommandsOf(data);
    if(subcommands.length > 0) {
        return subcommands.map(sub => {
            const optionLines = (sub.options || []).map(formatOption);
            const value = optionLines.length > 0 ? `${sub.description}\n${optionLines.join('\n')}` : sub.description;
            return { name: `/${data.name} ${sub.name}`, value };
        });
    }
    const optionLines = (data.options || []).map(formatOption);
    const value = optionLines.length > 0 ? `${data.description}\n${optionLines.join('\n')}` : data.description;
    return [{ name: `/${data.name}`, value }];
}

async function helpEmbed(commands, focusCommandName) {
    try {
        const embed = new EmbedBuilder()
            .setColor('#ffff00')
            .setTimestamp()
            .setFooter({ text: `Sipasaurus Rex v${version}` });

        if(focusCommandName) {
            const command = commands.get(focusCommandName);
            if(!command || excludedFromHelp.includes(focusCommandName)) {
                embed.setDescription(`Unknown command: \`${focusCommandName}\``);
                return embed;
            }
            embed.setDescription(`Help for \`/${focusCommandName}\``);
            embed.addFields(commandDetailFields(command.data.toJSON()));
        }
        else {
            embed.setDescription('Sipa commands\nUse `/help command:<name>` for detailed usage on a specific command.');
            const fields = [];
            for(const [name, command] of commands) {
                if(excludedFromHelp.includes(name)) continue;
                fields.push(commandSummaryField(command.data.toJSON()));
            }
            embed.addFields(fields);
        }
        return embed;
    }
    catch(error) {
        console.log(`Error creating help embed: ${error})`);
    }
}

module.exports.helpEmbed = helpEmbed;
