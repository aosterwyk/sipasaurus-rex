const path = require('node:path');
const Nedb = require('nedb-promises');
const botSettings = require('../botSettings.json');

const dbPath = path.join(botSettings.dbLocation, 'guilds.db');
const db = Nedb.create({ filename: dbPath });

async function getAllGuildSettings(guildId) {
  try {
    await db.loadDatabase(); // Force reload from disk before reading
    // Query the database for all settings for this guildId
    const settings = await db.findOne({ id: guildId });

    if(settings) {
        return settings;
    } else { 
        return {};
    }
  } catch (error) {
    console.error(`Error fetching all settings for guild ${guildId}:`, error);
    return {};
  }
}

async function getGuildSetting(guildId, setting) {
  try {
    // Query the database for a specific setting
    const result = await db.findOne({ id: guildId, key: setting });
    
    // Check if the setting was found
    if (result) {
      return result.value;
    } else {
      return undefined;
    }
  } catch (error) {
    console.error(`Error fetching setting ${setting} for guild ${guildId}:`, error);
    return undefined;
  }
}

module.exports.getAllGuildSettings = getAllGuildSettings;
module.exports.getGuildSetting = getGuildSetting;