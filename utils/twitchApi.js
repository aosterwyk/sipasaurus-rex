// const fetch = require('node-fetch');
const axios = require('axios');
const botSettings = require('../botSettings.json');
let accessToken = botSettings.twitchAccessToken;
let refreshToken = botSettings.twitchRefreshToken;

const fs = require('fs').promises; // Use promises for async/await
const path = require('path');

// Path to your JSON file (adjust as needed)
const settingsFilePath = path.join(__dirname, '../botSettings.json');

// Function to update multiple settings in the JSON file
async function updateSettings(newSettings) {
    try {
        // Read the existing JSON file
        let settings;
        try {
            const rawData = await fs.readFile(settingsFilePath, 'utf8');
            settings = JSON.parse(rawData); // Parse into an object
        } 
        catch (readError) {
            if (readError.code === 'ENOENT') {
                // File doesn’t exist, start with an empty object
                settings = {};
            } 
            else {
                throw readError; // Other errors (e.g., invalid JSON)
            }
        }

        // Validate input
        if (!newSettings || typeof newSettings !== 'object') {
            throw new Error('newSettings must be an object with key-value pairs');
        }

        // Update or add each setting
        for (const [key, value] of Object.entries(newSettings)) {
            if (settings.hasOwnProperty(key)) {
                // Setting exists (could be "", null, or any value), update it
                console.log(`Updating existing setting: ${key} = ${value}`);
                settings[key] = value;
            } 
            else {
                // Setting doesn’t exist, add it
                console.log(`Adding new setting: ${key} = ${value}`);
                settings[key] = value;
            }
        }

        await fs.writeFile(settingsFilePath, JSON.stringify(settings, null, 2), 'utf8');
        console.log('Settings updated successfully.');
    } 
    catch (error) {
        console.error('Error updating settings:', error.message);
    }
}

async function refreshAccessToken() {
    if (!refreshToken) {
        throw new Error('No refresh token available');
    }

    try {
        const response = await axios.post('https://id.twitch.tv/oauth2/token', {
            client_id: botSettings.twitchClientId,
            client_secret: botSettings.twitchSecret,
            refresh_token: refreshToken,
            grant_type: 'refresh_token'
        });

        accessToken = response.data.access_token;
        refreshToken = response.data.refresh_token; // Update refresh token if provided
        
        const newSettings = {
            twitchAccessToken: accessToken,
            twitchRefreshToken: refreshToken
        };
        await updateSettings(newSettings);        

        console.log('New Access Token:', accessToken);
        console.log('New Refresh Token (if updated):', refreshToken);
        return accessToken;
    } catch (error) {
        console.error('Token refresh failed:', error.response ? error.response.data : error.message);
        throw error;
    }
}

async function twitchAPI(url) {
    try {
        // let result = await fetch(url, {method: 'get', headers: {'Client-ID': botSettings.twitchClientId, 'Authorization': `Bearer ${botSettings.twitchToken}`}});
        // result = await result.json();
        // return result;
        const response = await axios.get(url, {
            headers: {
                'Client-ID': botSettings.twitchClientId,
                'Authorization': `Bearer ${accessToken}`
            }
        });
        // console.log(response.data.data);
        return response.data.data;
    }
    catch(error) {
        if (error.response && error.response.status === 401) { // Token expired
            console.log('Token expired, attempting to refresh...');
            const newToken = await refreshAccessToken();
            return getUserInfo(newToken); // Retry with new token // TODO - this probably breaks for a lot of functions (steam info, etc.)
        }
        else {        
            console.log(`Twitch API error: ${error}`);
            return false;
        }
    }
}

async function getStreamInfo(channelName) {
    try {
        let url = `https://api.twitch.tv/helix/streams?user_login=${channelName}`;
        const result = await twitchAPI(url);
        // return result.data[0];
        return result[0];
    }
    catch(error) {
        console.log(`Twitch API error: ${error}`);
        return false;
    }
}

async function getTwitchUserInfo(twitchUsername) {
    try {
        let url = `https://api.twitch.tv/helix/users?login=${twitchUsername}`;
        const result = await twitchAPI(url);
        // return result.data[0];
        return result[0];
    }
    catch(error) {
        console.log(`Twitch API error: ${error}`);
        return false;
    }
}

async function getTwichClips(twitchUsername) { 
    let clipStartTime = new Date();
    clipStartTime.setDate(clipStartTime.getDate() - 30);
    let clipStartTimeISO = clipStartTime.toISOString();
    let clipEndTime = new Date();
    let clipEndTimeISO = clipEndTime.toISOString();

    const twitchUserInfo = await getTwitchUserInfo(twitchUsername);
    let url = `https://api.twitch.tv/helix/clips?broadcaster_id=${twitchUserInfo.id}&started_at=${clipStartTimeISO}&ended_at=${clipEndTimeISO}`;
    const result = await twitchAPI(url);
    // return result.data;
    return result;
}

async function getTwitchVideos(twitchUsername) {
    const twitchUserInfo = await getTwitchUserInfo(twitchUsername);
    let url = `https://api.twitch.tv/helix/videos?user_id=${twitchUserInfo.id}&sort=time&type=archive&first=1`;
    const result = await twitchAPI(url);
    // return result.data;
    return result;
}

async function getStreamMarkers(videoId) {
    let url = `https://api.twitch.tv/helix/streams/markers?video_id=${videoId}`;
    const result = await twitchAPI(url);
    console.log(result);
    if(result.error !== undefined && result.error == 'Unauthorized') {
        console.log(`Error getting stream markers: ${result.message}`);
    }
    // console.log(result);
    if(result.data.videos !== undefined && result.data.videos.markers !== undefined) {
        console.log(result.data.videos.markers);
    }
    else {
        console.log(`No marker data`);
    }
    // return result.data;
}


module.exports.getStreamInfo = getStreamInfo;
module.exports.getTwitchUserInfo = getTwitchUserInfo;
module.exports.getTwichClips = getTwichClips;
module.exports.getStreamMarkers = getStreamMarkers;
module.exports.getTwitchVideos = getTwitchVideos;