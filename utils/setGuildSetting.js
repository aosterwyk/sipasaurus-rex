const dbLocation = require('../botSettings.json').dbLocaion;
const Nedb = require('nedb-promises');
const guildsDb = Nedb.create({ filename: `${dbLocation}\\guilds.db`, autoload: true });

const fs = require('fs');
const { getAllGuildSettings } = require('./getGuildSettings');
const guildsSettingsDir = require('../botSettings.json').guildSettingsDir

function checkConfigDir(configDir) {
    if (!fs.existsSync(configDir)){
        fs.mkdirSync(configDir);
    }
}

async function setGuildSetting(guildSettingsFilename, setting, newValue) {
    let newSettings = {}; 
    let guildSettingsFilePath = `${guildsSettingsDir}${guildSettingsFilename}.sipa`;
    // check if settings dir exists
    if (!fs.existsSync(guildsSettingsDir)){
        console.log(`Settings directory ${guildsSettingsDir} does not exist. Attempting to create it.`);
        try { 
            fs.mkdirSync(guildsSettingsDir);
            console.log(`Created ${guildsSettingsDir}`);
        }
        catch(error) { 
            console.log(`Error: ${error}`);
        }
    }
    
    if(fs.existsSync(guildSettingsFilePath)) {
        let foundSetting = false;
        const oldSettings = await getAllGuildSettings(guildSettingsFilename);
        for(let key in oldSettings) {
            if(key == setting) { 
                newSettings[key] = newValue;
                foundSetting = true;
            }
            else {
                newSettings[key] = oldSettings[key];
            }
        }
        if(!foundSetting) {
            newSettings[setting] = newValue;
        }
    }
    else {
        newSettings[setting] = newValue;
    }
    try {
        fs.writeFileSync(guildSettingsFilePath,JSON.stringify(newSettings));
        // return true;
    }
    catch(error) {
        console.log(error);
        // return false;
    }

    console.log(`Done updating setting in file. Updating setting in db...`);

    try {
        const numAffected = await guildsDb.update(
            { id: guildSettingsFilename },
            { $set: { [setting]: newValue }},
            { upsert: true}
        );
        console.log(`Updated ${numAffected} guild(s)`);
        return true;
    } 
    catch (error) 
    {
        console.error('Error updating guild:', error);
        return false;
    }
}
 
module.exports.setGuildSetting = setGuildSetting;