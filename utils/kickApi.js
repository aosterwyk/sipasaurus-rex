const axios = require('axios');
const botSettings = require('../botSettings.json');
let accessToken = botSettings.kickAccessToken;
let refreshToken = botSettings.kickRefreshToken;

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
        const response = await axios.post('https://id.kick.com/oauth/token', {
            client_id: botSettings.kickClientId,
            client_secret: botSettings.kickClientSecret,
            refresh_token: refreshToken,
            grant_type: 'refresh_token'
        });

        accessToken = response.data.access_token;
        refreshToken = response.data.refresh_token; // Update refresh token if provided
        
        const newSettings = {
            kickAccessToken: accessToken,
            kickRefreshToken: refreshToken
        };
        await updateSettings(newSettings);        

        console.log('New Kick Access Token:', accessToken);
        console.log('New Kick Refresh Token (if updated):', refreshToken);
        return accessToken;
    } catch (error) {
        console.error('Kick token refresh failed:', error.response ? error.response.data : error.message);
        throw error;
    }
}

// async function kickAPI(url) {
//     try {
//         // let result = await fetch(url, {method: 'get', headers: {'Client-ID': botSettings.twitchClientId, 'Authorization': `Bearer ${botSettings.twitchToken}`}});
//         // result = await result.json();
//         // return result;
//         const response = await axios.get(url, {
//             headers: {
//                 'Authorization': `Bearer ${token}`,
//                 'Accept': 'application/json'
//             }
//         });
//         // console.log(response.data);
//         return response.data;
//     }
//     catch(error) {
//         if (error.response && error.response.status === 401) { // Token expired
//             console.log('Kick token expired, attempting to refresh...');
//             const newToken = await refreshAccessToken();
//             return false; // wait for next retry TODO - automatic retry?
//         }
//         else {        
//             console.log(`Twitch API error: ${error}`);
//             return false;
//         }
//     }
// }

async function getKickUser() {
    try {
        const response = await axios.get('https://api.kick.com/public/v1/users', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json'
            }
        });
        return response.data.data[0];
    } catch (error) {
        if (error.response && error.response.status === 401) {
            console.log('Token expired, refreshing...');
            const newToken = await refreshAccessToken();
            // return;
            return getKickUser();
        }
        console.error('Failed to get user info:', error.response ? error.response.data : error.message);
        return null;
    }
}

/* example output
{
  user_id: 8497431,
  name: 'VariXx2',
  email: 'mail@example.com',
  profile_picture: 'https://files.kick.com/images/user/8497431/profile_image/conversion/43395aa1-680a-4dc5-a81d-b055307f03c9-fullsize.webp'
}
*/

async function getKickChannelInfo(userId) {
    try {
        const response = await axios.get('https://api.kick.com/public/v1/channels', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json'
            },
            params: {
                broadcaster_user_id: userId
                // broadcaster_user_id: 1234 // this works if you know the ID
            }
        });
        return response.data.data[0];
    } catch (error) {
        if (error.response && error.response.status === 401) {
            console.log('Token expired, refreshing...');
            const newToken = await refreshAccessToken();
            return getKickChannelInfo(userId);
        }
        console.error('Failed to get channel info:', error.response ? error.response.data : error.message);
        return null;
    }
}

/* example output
{
  broadcaster_user_id: 8497431,
  slug: 'varixx2',
  channel_description: 'No time for love, Doctor Jones!',
  banner_picture: 'https://files.kick.com/images/channel/7745908/banner_image/2479169f-ca0e-4cc2-bf5a-ec9f2ddd74e5',
  stream: {
    url: '',
    key: '',
    is_live: false,
    is_mature: true,
    language: 'English',
    start_time: '2024-04-29T23:49:24Z',
    viewer_count: 1
  },
  stream_title: 'hjkl adbsvfkj nlsvdabfkj ;sdbvfajk',
  category: {
    id: 722,
    name: 'Team Fortress 2',
    thumbnail: 'https://files.kick.com/images/subcategories/722/banner/conversion/c42cf583-3e07-421b-8d20-7fa2447408b9-banner.webp'
  }
}
*/

module.exports.getKickUser = getKickUser;
module.exports.getKickChannelInfo = getKickChannelInfo;
