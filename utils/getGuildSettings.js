const fs = require('fs');
const util = require('util');
const guildsSettingsDir = require('../botSettings.json').guildSettingsDir;

async function getAllGuildSettings(guildId) {
    let guildSettings = {};
    let guildSettingsFilePath = `${guildsSettingsDir}${guildId}.sipa`;
    const readFile = util.promisify(fs.readFile);
    if(fs.existsSync(guildSettingsFilePath)) {
        try {
            const settingsFile = await readFile(guildSettingsFilePath);
            guildSettings = JSON.parse(settingsFile);
        }
        catch(error) {
            console.log(error);
        }
    }
    return guildSettings;
}

async function getGuildSetting(guildId, setting) {
    const guildSettings = await getAllGuildSettings(guildId);
    if(guildSettings.hasOwnProperty(setting)) {
        return guildSettings[setting];
    }
    return undefined;
}

module.exports.getAllGuildSettings = getAllGuildSettings;
module.exports.getGuildSetting = getGuildSetting;
