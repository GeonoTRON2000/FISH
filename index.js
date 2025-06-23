const utils = require('./utils.js');
const commands = require('./commands.js');
let config = utils.load_config();
const discord = require('discord.js');

const app = new discord.Client({
    intents: [discord.IntentsBitField.Flags.Guilds,
              discord.IntentsBitField.Flags.GuildMembers,
              discord.IntentsBitField.Flags.GuildMessages,
              discord.IntentsBitField.Flags.MessageContent]});

let state = {};

app.on('guildAvailable', async function (guild) {
    state[guild.id] = await utils.load_state(guild);
});

app.on('guildMemberAdd', async function (user) {
    if (!(user.guild.id in config.auto_roles)) return;

    await Promise.all(
        config.auto_roles[user.guild.id]
            .map(role_id => user.roles.add(role_id)));
});

app.on('messageCreate', async function (msg) {
    /* Do not log echoes of our own actions. */
    if (msg.author.id === msg.client.user.id)
        return;

    console.log(
        `[${msg.guild.name} | ${utils.timestamp()}] <${msg.author.username}> ${msg.content}`);

    if (utils.is_muted(state[msg.guildId], msg.author.id)
            && !utils.is_operator(state[msg.guildId], config, msg.guildId, msg.author.id)) {
        console.log(`User ${msg.author.username} is muted, suppressing message.`);
        await msg.delete();
        return;
    }

    if (msg.content.startsWith(config.activator)) {
        /* TODO: more nuanced permission model */
        if (!utils.is_operator(state[msg.guildId], config, msg.guildId, msg.author.id)) {
            console.log(`Command attempt by non-operator ${msg.author.username}.`);
            await msg.reply('That command requires server operator permission.');
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
                case 'help':
                    const command_names = Object.keys(commands).join(', ');
                    await utils.log_reply(msg, `Registered commands: ${command_names}`);
                    return;
                case 'reload':
                    console.log('Reloading configuration...');
                    config = utils.load_config();
                    for (const gid in state) {
                        const guild = await utils.fetch_id(app.guilds, gid);
                        if (guild) state[gid] = await utils.load_state(guild);
                        else {
                            console.log(
                                `[WARNING] Guild with ID ${gid} no longer exists, clearing its state.`);
                            delete state[gid];
                        }
                    }
                    await utils.log_reply(msg, 'Configuration reloaded successfully.');
                    return;
                default:
                    if (command in commands) {
                        const state_modified =
                            await commands[command](state[msg.guildId], msg, ...args.slice(1));
                        if (state_modified)
                            await utils.save_state(msg.guild, state[msg.guildId]);
                        return;
                    }
                    await utils.log_reply(msg, `No command found matching: ${command}.`);
            }
        } catch (e) {
            console.error(`[ERROR] Error processing command: ${command}`, e);
        }
    }
});

app.on('messageUpdate', function (old_msg, msg) {
    console.log(
        `[${msg.guild.name} | ${utils.timestamp()}] A message was edited:`);
    console.log(`ORIGINALLY: <${old_msg.author.username}> ${old_msg.content}`);
    console.log(`NOW: <${msg.author.username}> ${msg.content}`);
});

app.on('messageDelete', function (msg) {
    console.log(
        `[${msg.guild.name} | ${utils.timestamp()}] A message was deleted:`);
    console.log(`ORIGINALLY: <${msg.author.username}> ${msg.content}`);
});

app.login(config.token);
