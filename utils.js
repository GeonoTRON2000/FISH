const fs = require('fs').promises;

function timestamp () {
    const date = new Date();
    return `${date.getHours()}:${date.getMinutes()}`;
}

function mention (entity) {
    return `<@${entity.id}>`;
}

function load_config () {
    const config = require('./config.js');
    console.log('Loaded config.');
    return config;
}

async function load_state (guild) {
    try {
        const state = JSON.parse(await fs.readFile(`state/${guild.id}.json`));
        console.log(`Loaded state for ${guild.name}.`);
        return state;
    } catch {
        console.warn(`[WARNING] Unable to load state for ${guild.name}.`);
        return {permissions: {}, mutes: []};
    }
}

async function save_state (guild, state) {
    try {
        await fs.writeFile(`state/${guild.id}.json`, JSON.stringify(state));
        console.log(`Saved state for ${guild.name}.`);
    } catch {
        console.warn(
            `[WARNING] Unable to save state for ${guild.name}, a crash may result in data loss.`);
    }
}

function is_muted (state, uid) {
    return state?.mutes && state.mutes.indexOf(uid) !== -1;
}

async function log_reply (msg, output) {
    console.log(output);
    await msg.reply(output);
}

async function find_nick (msg, nickname, uid_handler) {
    if (!uid_handler)
        uid_handler = async uid => await fetch_id(msg.client.users, uid);

    if (nickname.startsWith('<@') && nickname.endsWith('>'))
        return await uid_handler(nickname.substring(2, nickname.length - 1));

    const guild_members = await msg.guild.members.fetch({ query: nickname, limit: 2 });

    for (const guild_member of guild_members.values()) {
        if (guild_members.size === 1
            || guild_member.user.username === nickname
            || guild_member.user.id === nickname)
            return guild_member.user;
    }
    return false;
}

async function find_exact(msg, nickname) {
    if (nickname.startsWith('<@') && nickname.endsWith('>'))
        return await fetch_id(msg.client.users, nickname.substring(2, nickname.length - 1));

    return false;
}

async function fetch_id (manager, id) {
    try {
        return await manager.fetch(id);
    } catch {
        return false;
    }
}

module.exports =
    { timestamp, mention, load_config, load_state, save_state,
        is_muted, log_reply, find_nick, find_exact, fetch_id };
