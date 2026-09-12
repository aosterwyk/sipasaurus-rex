const fs = require('fs');
const { getAllGuildSettings } = require('./getGuildSettings');
const guildsSettingsDir = require('../botSettings.json').guildSettingsDir;

function checkConfigDir(configDir) {
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }
}

async function setGuildSetting(guildId, setting, newValue) {
    checkConfigDir(guildsSettingsDir);
    let guildSettingsFilePath = `${guildsSettingsDir}${guildId}.sipa`;
    const newSettings = await getAllGuildSettings(guildId);
    if(newValue === undefined) {
        delete newSettings[setting];
    }
    else {
        newSettings[setting] = newValue;
    }
    try {
        fs.writeFileSync(guildSettingsFilePath, JSON.stringify(newSettings));
        return true;
    }
    catch(error) {
        console.log(error);
        return false;
    }
}

module.exports.setGuildSetting = setGuildSetting;
