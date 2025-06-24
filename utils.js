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

async function fetch_user (msg, nickname) {
    if (nickname.startsWith('<@') && nickname.endsWith('>'))
        return await fetch_id(msg.client.users, nickname.substring(2, nickname.length - 1));

    return false;
}

async function fetch_guild_member (msg, nickname) {
    if (nickname.startsWith('<@') && nickname.endsWith('>'))
        return await fetch_id(msg.guild.members, nickname.substring(2, nickname.length - 1));

    return false;
}

async function fetch_roles (msg, roles) {
    const role_futures = [];
    for (const role of roles) {
        if (!role.startsWith('<@&') || !role.endsWith('>'))
            return false;
        role_futures.push(msg.guild.roles.fetch(role.substring(3, role.length - 1)));
    }

    try {
        return Promise.all(role_futures);
    } catch {
        return false;
    }
}

async function fetch_id (manager, id) {
    try {
        return await manager.fetch(id);
    } catch {
        return false;
    }
}

async function search_guild_member (msg, nickname) {
    const guild_members = await msg.guild.members.fetch({ query: nickname, limit: 2 });
    nickname = nickname.toLowerCase();

    for (const guild_member of guild_members.values()) {
        if (guild_members.size === 1
            || guild_member.user.id === nickname
            || guild_member.user.username.toLowerCase() === nickname
            || guild_member.nickname?.toLowerCase() === nickname
            || guild_member.user.globalName?.toLowerCase() === nickname)
            return guild_member;
    }
    return false;
}

module.exports =
    { timestamp, mention, load_config, load_state, save_state,
        is_muted, log_reply, fetch_user, fetch_guild_member,
        fetch_roles, fetch_id, search_guild_member };
