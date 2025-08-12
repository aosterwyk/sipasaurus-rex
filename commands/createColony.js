const botSettings = require('../botSettings.json');
const { setGuildSetting } = require('../utils/setGuildSetting');
const { getAllGuildSettings } = require('../utils/getGuildSettings');

module.exports = async function(message, client) {
    if (message.author.bot || !message.content) return;
    if (!message.mentions.has(client.user)) return;
    if (message.author.id !== botSettings.botOwnerID) {
        await message.reply({content: `Access denied.`});
        return;
    }

    // Remove bot mention from message content
    const botMention = `<@${client.user.id}>`;
    let content = message.content.replace(botMention, '').trim();

    if (!content.toLowerCase().startsWith('createcolony')) return;

    // Match: createcolony <projectname> <item1:amount1,item2:amount2,...>
    // Supports quoted project names with spaces
    const match = content.match(/^createcolony\s+("[^"]+"|\S+)\s+(.+)$/i);
    if (!match) {
        await message.reply({content: `Usage: @botname createcolony <projectname> <item1:amount1,item2:amount2,...>`});
        return;
    }
    let projectName = match[1];
    if (projectName.startsWith('"') && projectName.endsWith('"')) {
        projectName = projectName.slice(1, -1);
    }
    const itemsRaw = match[2];
    const channelId = message.channel.id;
    const guildId = message.guild.id;
    // Always fetch fresh settings from DB
    const settings = await getAllGuildSettings(guildId);

    // Check if this channel already has a project
    if (settings.projects && settings.projects[channelId]) {
        await message.reply({content: `This channel already has a project. Delete it first or use a different channel.\nCurrent projects: ${JSON.stringify(settings.projects)}` , ephemeral: true});
        return;
    }

    // Parse items
    const itemsArr = itemsRaw.split(',').map(i => i.trim());
    let items = {};
    for(const item of itemsArr) {
        const parts = item.split(':');
        if(parts.length !== 2) {
            await message.reply({content: `Invalid item format: ${item}. Use format like "steel:100"`});
            return;
        }
        const [key, value] = parts;
        const amount = parseInt(value.trim());
        if(isNaN(amount)) {
            await message.reply({content: `Invalid amount for ${key}: ${value}`});
            return;
        }
        items[key.trim()] = amount;
    }

    // Create summary message
    let summary = `**${projectName}**\n`;
    for(const [k, v] of Object.entries(items)) {
        summary += `${k}: ${v}\n`;
    }
    const msg = await message.channel.send(summary);

    // Save project to database (using channelId as key)
    const projectData = {
        name: projectName,
        messageId: msg.id,
        items: items
    };

    await setGuildSetting(guildId, `projects.${channelId}`, projectData);
    await message.reply({content: `Project "${projectName}" created in this channel!`, ephemeral: true});
}
