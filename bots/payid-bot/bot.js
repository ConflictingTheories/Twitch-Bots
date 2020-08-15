const Discord = require('discord.io');
const logger = require('winston');
const axios = require('axios');
const disAuth = require('./auth/discord.json');
const twiAuth = require('./auth/twitch.json');
const hook = require('./auth/webhook.json');
const blackList = require('./auth/blacklist.json');
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
    runBotCommands(message, evt.d.author.username, false);
}
function onTwitchMessageHandler(target, context, msg, self) {
    if (self) { return; }
    const commandName = msg.trim();
    runBotCommands(commandName, context.username, true);
}

async function getPayIdInfo(payid) {
    console.log(payid);
    let prefix = `${payid.split('$')[0]}`;
    let domain = `${payid.split('$')[1]}`;
    let url = `https://${domain}/${prefix}`;
    return await axios({
        method: 'GET',
        url: url,
        headers: {
            'PayID-Version': '1.0',
            'Accept': 'application/payid+json'
        }
    });
}

function formatPayId(payid){
    let out = [`**Found __PayID__** : **${payid.payId}**\t\t(see https://payid.org)`];
    payid.addresses.map((x)=>out.push(`\t__Network__ : **${x.paymentNetwork}** (${x.environment})\t__Address Details__ : \`${JSON.stringify(x.addressDetails)}\``));
    return out.join('\n')
}


// === Commands
function runBotCommands(message, user, twi) {
    if (message.substring(0, 2) == '#!') {
        var args = message.substring(2).split(' ');
        var cmd = args[0];
        args = args.splice(1);
        switch (cmd) {
            case 'payid':
                getPayIdInfo(args[0]).then((payid)=>{
                    console.log(payid.data)
                    let formattedString = formatPayId(payid.data)
                    if(payid){
                        twiBot.say(user, `${formattedString}`);
                        axios.post(hook.url, { content: `${formattedString}`})
                    }
                })
                break;
        }
    } else { }
}

// ===============
// Misc Functions / Commands
function rollDice() {
    const sides = 6;
    return Math.floor(Math.random() * sides) + 1;
}
