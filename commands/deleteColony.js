const botSettings = require('../botSettings.json');
const { getColonyProjects, deleteColonyProject } = require('../utils/colonyProjects');

module.exports = async function(message, client) {
    if (message.author.bot || !message.content) return;
    if (!message.mentions.has(client.user)) return;
    if (message.author.id !== botSettings.botOwnerID) {
        // await message.reply({content: `Access denied.`});
        return;
    }
    const botMention = `<@${client.user.id}>`;
    let content = message.content.replace(botMention, '').trim();
    if (!content.toLowerCase().startsWith('deletecolony')) return;
    const channelId = message.channel.id;
    const guildId = message.guild.id;
    // Always fetch fresh projects from file
    const projects = await getColonyProjects(guildId);
    if (!projects[channelId]) {
        await message.reply({content: `No project exists in this channel.\nCurrent projects: ${JSON.stringify(projects)}`});
        return;
    }
    const project = projects[channelId];
    // Delete summary message
    try {
        const summaryMsg = await message.channel.messages.fetch(project.messageId);
        await summaryMsg.delete();
    } catch (error) { /* ignore */ }
    // Remove project from file
    await deleteColonyProject(guildId, channelId);
    await message.reply({content: `Project deleted from this channel.`});
}
