const fs = require('fs');
const util = require('util');
const guildsSettingsDir = require('../botSettings.json').guildSettingsDir;

function checkConfigDir(configDir) {
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }
}

function colonyProjectsFilePath(guildId) {
    return `${guildsSettingsDir}${guildId}-colonyProjects.sipa`;
}

async function getColonyProjects(guildId) {
    let projects = {};
    const filePath = colonyProjectsFilePath(guildId);
    const readFile = util.promisify(fs.readFile);
    if(fs.existsSync(filePath)) {
        try {
            const projectsFile = await readFile(filePath);
            projects = JSON.parse(projectsFile);
        }
        catch(error) {
            console.log(error);
        }
    }
    return projects;
}

async function setColonyProject(guildId, channelId, projectData) {
    checkConfigDir(guildsSettingsDir);
    const projects = await getColonyProjects(guildId);
    projects[channelId] = projectData;
    try {
        fs.writeFileSync(colonyProjectsFilePath(guildId), JSON.stringify(projects));
        return true;
    }
    catch(error) {
        console.log(error);
        return false;
    }
}

async function deleteColonyProject(guildId, channelId) {
    checkConfigDir(guildsSettingsDir);
    const projects = await getColonyProjects(guildId);
    delete projects[channelId];
    try {
        fs.writeFileSync(colonyProjectsFilePath(guildId), JSON.stringify(projects));
        return true;
    }
    catch(error) {
        console.log(error);
        return false;
    }
}

module.exports.getColonyProjects = getColonyProjects;
module.exports.setColonyProject = setColonyProject;
module.exports.deleteColonyProject = deleteColonyProject;
