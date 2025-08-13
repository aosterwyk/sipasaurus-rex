const { getAllGuildSettings } = require('../utils/getGuildSettings');
const { setGuildSetting } = require('../utils/setGuildSetting');

module.exports = async function(message, client) {
    if (message.author.bot || !message.content) return;
    if (!message.mentions.has(client.user)) return;

    // Remove bot mention from message content
    const botMention = `<@${client.user.id}>`;
    let content = message.content.replace(botMention, '').trim();

    // Only run if format matches: <item> <number>
    const match = content.match(/^(\w[\w\s]*)\s+(\d+)$/);
    if (!match) return;

    let itemNameRaw = match[1].toLowerCase().trim();
    let amount = parseInt(match[2]);
    if (isNaN(amount) || amount < 0) return;

    const channelId = message.channel.id;
    const guildId = message.guild.id;
    // Always fetch fresh settings from DB
    const settings = await getAllGuildSettings(guildId);
    console.log('UpdateColony: guildId:', guildId, 'channelId:', channelId, 'settings.projects:', JSON.stringify(settings.projects));
    // Defensive: ensure settings.projects exists
    const projects = settings.projects || {};
    try {
        // Get project for this channel
        const project = projects[channelId];
        if (!project) {
            await message.reply({content: `No project exists in this channel.`});
            return;
        }
        // Fuzzy match item
        let itemKey = Object.keys(project.items).find(k => k.toLowerCase() === itemNameRaw);
        if (!itemKey) {
            itemKey = Object.keys(project.items).find(k => k.toLowerCase().startsWith(itemNameRaw)) ||
                      Object.keys(project.items).find(k => k.toLowerCase().includes(itemNameRaw));
        }
        if (!itemKey) {
            await message.reply({content: `Item not found.`});
            return;
        }
        // Remove from the count
        project.items[itemKey] -= amount;
        if (project.items[itemKey] < 0) project.items[itemKey] = 0;
        // Save updated project to database
        await setGuildSetting(guildId, `projects.${channelId}`, project);
        // Update the summary message
        let summary = `**${project.name}**\n`;
        for (const [k, v] of Object.entries(project.items)) {
            if (v > 0) {
                summary += `${k}: ${v}\n`;
            }
        }
        try {
            const summaryMsg = await message.channel.messages.fetch(project.messageId);
            await summaryMsg.edit(summary);
            await message.react('✅');
            // await message.reply({content: `Project updated.`});
        } catch (error) {
            console.error('Error updating project summary message:', error);
            await message.react('❌');
        }
    } catch (error) {
        console.error('Error handling project update:', error);
        await message.react('❌');
    }
}
