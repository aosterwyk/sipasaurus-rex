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
    if (!content.toLowerCase().startsWith('deletecolony')) return;
    const channelId = message.channel.id;
    const guildId = message.guild.id;
    // Always fetch fresh settings from DB
    const settings = await getAllGuildSettings(guildId);
    if (!settings.projects || !settings.projects[channelId]) {
        await message.reply({content: `No project exists in this channel.\nCurrent projects: ${JSON.stringify(settings.projects)}`});
        return;
    }
    const project = settings.projects[channelId];
    // Delete summary message
    try {
        const summaryMsg = await message.channel.messages.fetch(project.messageId);
        await summaryMsg.delete();
    } catch (error) { /* ignore */ }
    // Remove project from DB
    await setGuildSetting(guildId, `projects.${channelId}`, undefined); // Use $unset for this channel
    await message.reply({content: `Project deleted from this channel.`});
}
