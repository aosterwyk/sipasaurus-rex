const botSettings = require('../botSettings.json');
const { getAllGuildSettings } = require('../utils/getGuildSettings');
const { setGuildSetting } = require('../utils/setGuildSetting');

module.exports = async function(message, client) {
    if (message.author.bot || !message.content) return;
    if (!message.mentions.has(client.user)) return;
    if (message.author.id !== botSettings.botOwnerID) {
        await message.reply({content: `Access denied.`});
        return;
    }
    const botMention = `<@${client.user.id}>`;
    let content = message.content.replace(botMention, '').trim();
    if (!content.toLowerCase().startsWith('editcolony')) return;
    // Match: editcolony <item> <newvalue>
    const match = content.match(/^editcolony\s+(\S+)\s+(\d+)$/i);
    if (!match) {
        await message.reply({content: `Usage: @botname editcolony <item> <newvalue>`});
        return;
    }
    const itemNameRaw = match[1].toLowerCase();
    const newValue = parseInt(match[2]);
    const channelId = message.channel.id;
    const guildId = message.guild.id;
    // Always fetch fresh settings from DB
    const settings = await getAllGuildSettings(guildId);
    if (!settings.projects || !settings.projects[channelId]) {
        await message.reply({content: `No project exists in this channel.`});
        return;
    }
    const project = settings.projects[channelId];
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
    project.items[itemKey] = Math.max(0, newValue);
    await setGuildSetting(guildId, `projects.${channelId}`, project);
    // Update summary message
    let summary = `**${project.name}**\n`;
    for (const [k, v] of Object.entries(project.items)) {
        summary += `${k}: ${v}\n`;
    }
    try {
        const summaryMsg = await message.channel.messages.fetch(project.messageId);
        await summaryMsg.edit(summary);
        await message.reply({content: `Set ${itemKey} to ${project.items[itemKey]}.`});
    } catch (error) {
        await message.reply({content: `Item updated, but failed to update summary message.`});
    }
}
