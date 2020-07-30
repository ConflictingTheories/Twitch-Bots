const Discord = require('discord.io');
const logger = require('winston');
const axios = require('axios');
const disAuth = require('./auth/discord.json');
const twiAuth = require('./auth/twitch.json');
const hook = require('./auth/webhook.json');
const seeds = require('./plugs/seeds.json');
const tmi = require('tmi.js');

// Interval for Running our Plugs
const INTERVAL_LENGTH = 30 * 10000; // 30s (30000ms)

let plugInterval = null;
let plugContainer = [];


// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console, {
    colorize: true
});
logger.level = 'debug';

// Initialize Bots
const twiBot = new tmi.client(twiAuth);
const disBot = new Discord.Client({
    token: disAuth.token,
});

// Start & Initialize the Bot
initBot();


// Initialization Function
function initBot() {
    // DISCORD ---
    // Ready (Load)
    disBot.on('ready', (evt) => {
        logger.info('Connected *DISCORD*');
        logger.info('Logged in as: ');
        logger.info(disBot.username + ' - (' + disBot.id + ')');
    });
    disBot.on('message', onDiscordMessageHandler);
    disBot.connect();

    // TWITCH ---
    // Ready (Load)
    twiBot.on('connected', (addr, port) => {
        logger.info('Connected *TWITCH*');
        logger.info('Logged in as: ');
        logger.info(twiAuth.identity.username + ' - ( on ' + addr + ':' + port + ')');
    });
    twiBot.on('message', onTwitchMessageHandler);
    twiBot.connect();
    // Seed
    console.log('-- Seeding Plugs')
    plugContainer = seeds.map(plugObj => {
        return {
            url: plugObj.url.match(/http[s]?:\/\//i).length > 0 ? '' + plugObj.url : 'https://' + plugObj.url,
            tag: ('' + plugObj.tag).slice(0, 27),
            msg: ('' + plugObj.msg).slice(0, 140),
            expiration: plugObj.expiration ? new Date(plugObj.expiration).getTime() : -1,
            count: +plugObj.count || -1,
        }
    });
    // Start
    startBot();
}

// Message Handlers
function onDiscordMessageHandler(user, userID, channelID, message, evt) {
    runBotCommands(message, evt.d.author.username, false);
}
function onTwitchMessageHandler(target, context, msg, self) {
    if (self) { return; }
    const commandName = msg.trim();
    runBotCommands(commandName, context.username, true);
}


// === Commands
function runBotCommands(message, user, twi) {
    if (message.substring(0, 2) == '#!') {
        if (user !== 'kderbyma') {
            // Discord (Markdown)
            if (!twi) axios.post(hook.url, { content: `Who do you think you are?! - ${user}` })
            // Twitch (No Formatting)
            if (twi) twiBot.say(twiAuth.channels[0], `Who do you think you are?! - ${user}`)
        } else {
            var args = message.substring(2).split('`');
            var cmd = args[0];
            args = args.splice(1);
            switch (cmd.trim()) {
                case 'start':
                    startBot();
                    break;
                case 'stop':
                    stopBot();
                    break;
                case 'add-plug':
                    addPlug(args);
                    break;
                case 'list-plugs':
                    listPlugs();
                    break;
                case 'rem-plug':
                    removePlug(args);
                case 'rem-all':
                    removeAllPlugs();
            }
        }
    } else { // On Every Message

    }
}


// Core Output
function shamelesslyPlugAway() {
    console.log('--just plugging')
    // Where we perform our output
    let n = plugContainer.length;
    if (n) {
        let index = ~~((Math.random() * n) % n)
        let x = plugContainer[index];
        // Discord (Markdown)
        axios.post(hook.url, { content: `${x.url} - *${x.msg}* : ${x.tag}` })
        // Twitch (No Formatting)
        twiBot.say(twiAuth.channels[0], `${x.url} - *${x.msg}* : ${x.tag}`);
        if ((x.expiration >= 0 && x.expiration < Date.now()) || x.count == 0)
            plugContainer.filter((x, i) => i != index)
        else {
            x.count = x.count > 0 ? x.count - 1 : -1;
            plugContainer[index] = x;
        }
    }
}

// ===============
// Misc Functions / Commands
function startBot() {
    console.log('-- Starting Bot')
    plugInterval = plugInterval ? plugInterval : setInterval(shamelesslyPlugAway, INTERVAL_LENGTH);
}

function stopBot() {
    console.log('-- Stopping Bot')
    clearInterval(plugInterval);
}

function addPlug(args) {
    console.log('-- Adding Plug')
    try {
        let plug = args[0];
        let plugObj = JSON.parse(plug);
        let cleanPlug = {
            url: plugObj.url.match(/http[s]?:\/\//i).length > 0 ? '' + plugObj.url : 'https://' + plugObj.url,
            tag: ('' + plugObj.tag).slice(0, 27),
            msg: ('' + plugObj.msg).slice(0, 140),
            expiration: plugObj.expiration ? new Date(plugObj.expiration).getTime() : -1,
            count: +plugObj.count || -1,
        }
        plugContainer.push(cleanPlug);
        console.log('--Plug Added', cleanPlug)
    } catch (e) {
        console.error(e);
    }
}

function listPlugs() {
    // Discord (Markdown)
    axios.post(hook.url, {
        content: plugContainer.map((x, i) => {
            return `- [${i}] **[url]**: __${x.url}__ **[msg]**: *${x.msg}* **[tag]**: __${x.tag}__ **[Expires]**: __${x.expiration}__ - **[Remainder]**: ${x.count}`
        }).join('\n')
    })
    // Twitch (No Formatting)
    twiBot.say(twiAuth.channels[0], plugContainer.map((x, i) => {
        return `- [${i}] [url]: ${x.url} - ${x.msg} [tag]: ${x.tag} [Expires]: ${x.expiration}] [Remainder]: ${x.count}`
    }).join('\n'));
}

function removePlug(args) {
    let index = +args[0];
    plugContainer = plugContainer.filter((x, i) => i != index);
    console.log(`-- Removed Plug ${index}`)
}

function removeAllPlugs() {
    plugContainer = [];
    console.log(`-- Removed all Plugs`)
}

