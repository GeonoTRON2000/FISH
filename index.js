const utils = require('./utils.js');
let config = utils.load_config();
let commands = utils.load_commands();
const discord = require('discord.js');

const app = new discord.Client({
    intents: [discord.IntentsBitField.Flags.Guilds,
              discord.IntentsBitField.Flags.GuildMembers,
              discord.IntentsBitField.Flags.GuildMessages,
              discord.IntentsBitField.Flags.MessageContent]});

let state = utils.load_state();

app.on('ready', function () {
    console.log('Bot is ready, waiting for events...');
});

app.on('guildAvailable', async function (guild) {
    if (!state[guild.id]) {
        state[guild.id] = {authorized_users: []};
    }

    console.log('Joined server: ', guild.name);
});

app.on('guildMemberAdd', async function (user) {
    if (!(user.guild.id in config.auto_roles)) return;

    await Promise.all(
        config.auto_roles[user.guild.id]
            .map(role_id => user.roles.add(role_id)));
});

app.on('messageCreate', async function (msg) {
    console.log(
        `[${msg.guild.name} | ${utils.timestamp()}] <${msg.author.username}> ${msg.content}`);

    if (msg.content.startsWith(config.activator)) {
        if (state[msg.guildId].authorized_users.indexOf(msg.author.id) === -1
                && config.super_users[msg.guildId].indexOf(msg.author.id) === -1) {
            console.log('Command attempt with insufficient authorization.');
            await msg.reply('You are not authorized to used fish.');
            return;
        }

        const args = msg.content
            .substring(config.activator.length)
            .trim()
            .split(' ')
            .filter(s => s.length > 0);
        if (args.length < 1) return;

        const command = args[0].trim().toLowerCase();
        try {
            switch (command) {
                case 'reload':
                    console.log('Reloading configuration...');
                    config = utils.load_config();
                    commands = utils.load_commands();
                    state = utils.load_state();
                    await utils.log_reply(msg, 'Configuration reloaded successfully.');
                    return;
                default:
                    if (command in commands) {
                        await commands[command](state[msg.guildId], msg, ...args.slice(1));
                        return;
                    }
                    await utils.log_reply(`No command found matching: ${command}.`);
            }
        } catch (e) {
            console.error(`[ERROR] Error processing command: ${command}`, e);
        }
    }
});

app.on('messageUpdate', function (old_msg, msg) {
    console.log(
        `[${msg.guild.name} | ${utils.timestamp()}] ${msg.author.username} edited a message:`);
    console.log(`ORIGINALLY: ${old_msg.content}`);
    console.log(`NOW: ${msg.content}`);
});

app.on('messageDelete', function (msg) {
    console.log(
        `[${msg.guild.name} | ${utils.timestamp()}] ${msg.author.username} deleted a message:`);
    console.log(`ORIGINALLY: ${msg.content}`);
});

app.login(config.token);
