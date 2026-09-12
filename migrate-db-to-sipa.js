const fs = require('fs');
const path = require('node:path');
const botSettings = require('./botSettings.json');

const dbPath = path.join(botSettings.dbLocation, 'guilds.db');
const guildsSettingsDir = botSettings.guildSettingsDir;

function preserveExistingBackup(backupPath) {
    if (!fs.existsSync(backupPath)) return;
    const stats = fs.statSync(backupPath);
    const d = stats.mtime;
    const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    let preservedPath = `${backupPath}-${stamp}`;
    let counter = 1;
    while (fs.existsSync(preservedPath)) {
        preservedPath = `${backupPath}-${stamp}-${counter}`;
        counter++;
    }
    fs.renameSync(backupPath, preservedPath);
    console.log(`Preserved existing backup ${backupPath} -> ${preservedPath}`);
}

function backupIfExists(filePath) {
    if (fs.existsSync(filePath)) {
        const backupPath = `${filePath}.old`;
        preserveExistingBackup(backupPath);
        fs.renameSync(filePath, backupPath);
        console.log(`Existing file found. Renamed ${filePath} -> ${backupPath}`);
    }
}

(async () => {
    if (!fs.existsSync(dbPath)) {
        console.error(`Could not find db file at ${dbPath}`);
        return;
    }
    if (!fs.existsSync(guildsSettingsDir)) {
        fs.mkdirSync(guildsSettingsDir, { recursive: true });
    }

    const lines = fs.readFileSync(dbPath, 'utf8').split('\n').filter(line => line.trim().length > 0);

    for (const line of lines) {
        let doc;
        try {
            doc = JSON.parse(line);
        }
        catch (error) {
            console.error(`Skipping unparsable line in ${dbPath}: ${error}`);
            continue;
        }

        const guildId = doc.id;
        if (!guildId) {
            console.error(`Skipping doc with no guild id: ${line}`);
            continue;
        }

        const { id, _id, projects, ...settings } = doc;

        const settingsFilePath = path.join(guildsSettingsDir, `${guildId}.sipa`);
        backupIfExists(settingsFilePath);
        fs.writeFileSync(settingsFilePath, JSON.stringify(settings));
        console.log(`Wrote ${settingsFilePath}`);

        if (projects !== undefined) {
            const projectsFilePath = path.join(guildsSettingsDir, `${guildId}-colonyProjects.sipa`);
            backupIfExists(projectsFilePath);
            fs.writeFileSync(projectsFilePath, JSON.stringify(projects));
            console.log(`Wrote ${projectsFilePath}`);
        }
    }

    console.log('Migration from guilds.db to .sipa files complete.');
})();
