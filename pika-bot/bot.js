const Discord = require('discord.io');
const logger = require('winston');
const axios = require('axios');
const disAuth = require('./discord.json');
const twiAuth = require('./twitch.json');
const hook = require('./webhook.json');
const tmi = require('tmi.js');

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


// Message Handlers
function onDiscordMessageHandler(user, userID, channelID, message, evt) {
    runBotCommands(message, user, false);
}
function onTwitchMessageHandler(target, context, msg, self) {
    if (self) { return; }
    const commandName = msg.trim();
    runBotCommands(commandName, target, true);
}


// === Commands
function runBotCommands(message, user, twi) {
    if (message.substring(0, 1) == '!') {
        var args = message.substring(1).split(' ');
        var cmd = args[0];
        args = args.splice(1);
        switch (cmd) {
            case 'pika':
                twiBot.say(user, `Pikachu!!!!`);
                break;
            case 'attack':
                const num = rollDice();
                twiBot.say(user, `You did a ${num} damage`);
                break;
        }
    } else {
        // Feed Chat to Stream
        if (twi)
            axios.post(hook.url, {
                content: `${message} \n\t\t\t\t\t:: *obo ${user} from Twitch`
            })
        else if(message.indexOf('\t:: *obo') < 0)
            twiBot.say(twiAuth.channels[0], `${message} \n\t\t\t\t\t:: *obo ${user} from Discord`);
    }
}

// ===============
// Misc Functions / Commands
function rollDice() {
    const sides = 6;
    return Math.floor(Math.random() * sides) + 1;
}
