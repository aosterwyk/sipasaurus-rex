const path = require('node:path');
const fs = require('fs').promises; 
const { getGuildSetting, getAllGuildSettings } = require('./utils/getGuildSettings');
const botSettings = require('./botSettings.json'); 
const Nedb = require('nedb-promises');

const guildsSettingsDir = botSettings.guildSettingsDir;

const guildsDb = Nedb.create({ filename: `./guilds.db`, autoload: true });

async function saveSettingToDB(guildId, setting, newValue) {
    try {
        await guildsDb.update(
            { id: guildId },
            { $set: { [setting]: newValue }},
            { upsert: true}
        );
        console.log(`Updated ${setting} (${newValue}) for guild ${guildId}`);
        return true;
    } 
    catch (error) 
    {
        console.error(`Error updating ${setting} (${newValue}) for guild ${guildId}`, error);
        return false;
    }             
}

(async () => {
  try {
    const files = await fs.readdir(guildsSettingsDir);
    const commandFiles = files.filter(file => file.endsWith('.sipa'));

    for (const file of commandFiles) {
      console.log(`Processing file: ${file}`);
      const guildId = file.replace(".sipa", "");
      const settingsFromFile = await getAllGuildSettings(guildId);
      console.log(`Settings for guild ${guildId}:`, settingsFromFile);
      for (const [key, value] of Object.entries(settingsFromFile)) {
        console.log(`Key: ${key}, Value: ${value}, Type: ${typeof value}`);
        await saveSettingToDB(guildId, key, value);
      }
    }
    console.log('All settings saved successfully');
    console.log(`Compacting DB...`);
    await guildsDb.compactDatafile();    
  } catch (error) {
    console.error('Error processing guild settings:', error);
  }
})();
