const utils = require('./utils.js');
const permissions = require('./permissions.js');

/* TODO: role command or admin/deadmin */

/* FORMAT (inputs): guild state object, message object, parsed args */
/* FORMAT (output): whether guild state object was modified */

async function roll (_state, msg, lower_bound, upper_bound) {
    if (!lower_bound) {
        lower_bound = 1;
        upper_bound = 100;
    } else if (!upper_bound) {
        upper_bound = parseInt(lower_bound);
        lower_bound = 1;
    } else {
        lower_bound = parseInt(lower_bound);
        upper_bound = parseInt(upper_bound);
    }

    if (isNaN(lower_bound) || isNaN(upper_bound)) {
        await utils.log_reply(msg, 'Both bounds must be numbers.');
        return false;
    }

    const answer = Math.floor(Math.random() * (upper_bound - lower_bound + 1)) + lower_bound;
    await utils.log_reply(msg, `Roll (${lower_bound}-${upper_bound}): ${answer}`);
    return false;
}

async function grant (state, msg, nickname, ...perms) {
    if (!nickname || perms.length < 1) {
        await utils.log_reply(
            msg,
            'Usage: ;grant @<user> <permission1> [permission2...]'
                + ' -- grants the user the specified permission(s).');
        return false;
    }
    const target = await utils.fetch_user(msg, nickname)
                    || (await utils.search_guild_member(msg, nickname))?.user;
    if (!target) {
        await utils.log_reply(
            msg, `Could not find user matching "${nickname}", please be more specific.`);
        return false;
    }

    let state_modified = false;
    for (const perm of perms) {
        state_modified = permissions.grant(state, target.id, perm) || state_modified;
    }

    if (state_modified) {
        const perms_granted = perms.join(', ');
        console.log(`Granted permissions to user ${target.username}: ${perms_granted}`);
        await msg.reply(`Granted permissions to ${utils.mention(target)}: ${perms_granted}`);
        return true;
    }

    console.log(`User ${target.username} already has all these permissions.`);
    await msg.reply(`${utils.mention(target)} already has all these permissions.`);
    return false;
}

async function revoke (state, msg, nickname, ...perms) {
    if (!nickname || perms.length < 1) {
        await utils.log_reply(
            msg,
            'Usage: ;revoke @<user> <permission1> [permission2...]'
                + ' -- revokes the specified permission(s) from the user.');
        return false;
    }
    const target = await utils.fetch_user(msg, nickname)
                    || (await utils.search_guild_member(msg, nickname))?.user;
    if (!target) {
        await utils.log_reply(
            msg, `Could not find user matching "${nickname}", please be more specific.`);
        return false;
    }

    let state_modified = false;
    for (const perm of perms) {
        state_modified = permissions.revoke(state, target.id, perm) || state_modified;
    }

    if (state_modified) {
        const perms_revoked = perms.join(', ');
        console.log(`Revoked permissions from user ${target.username}: ${perms_revoked}`);
        await msg.reply(`Revoked permissions from ${utils.mention(target)}: ${perms_revoked}`);
        return true;
    }

    console.log(`User ${target.username} does not have any of these permissions.`);
    await msg.reply(`${utils.mention(target)} does not have any of these permissions.`);
    return false;
}

async function check_perms (state, msg, nickname) {
    if (!nickname) {
        await utils.log_reply(
            msg, 'Usage: ;check_perms @<user> -- displays the user\'s permissions.');
        return false;
    }
    const target = await utils.fetch_user(msg, nickname)
                    || (await utils.search_guild_member(msg, nickname))?.user;
    if (!target) {
        await utils.log_reply(
            msg, `Could not find user matching "${nickname}", please be more specific.`);
        return false;
    }

    const perms = permissions.view(state, target.id).join(', ');
    console.log(`User ${target.username} has permissions: ${perms}`);
    await msg.reply(`${utils.mention(target)} has permissions: ${perms}`);
    return false;
}

async function mute (state, msg, nickname) {
    if (!nickname) {
        await utils.log_reply(
            msg, 'Usage: ;mute @<user> -- prevents the user from typing in text channels.');
        return false;
    }
    const target = await utils.fetch_user(msg, nickname)
                    || (await utils.search_guild_member(msg, nickname))?.user;
    if (!target) {
        await utils.log_reply(
            msg, `Could not find user matching "${nickname}", please be more specific.`);
        return false;
    }

    if (!state.mutes) state.mutes = [];

    if (state.mutes.indexOf(target.id) === -1) {
        state.mutes.push(target.id);
        console.log(`Muted user ${target.username} in all text channels.`);
        await msg.reply(`Muted ${utils.mention(target)} in all text channels.`);
        return true;
    } else {
        console.log(`User ${target.username} is already muted.`);
        await msg.reply(`${utils.mention(target)} is already muted.`);
        return false;
    }
}

async function unmute (state, msg, nickname) {
    if (!nickname) {
        await utils.log_reply(
            msg, 'Usage: ;unmute @<user> -- enables a muted user to type in text channels.');
        return false;
    }
    const target = await utils.fetch_user(msg, nickname)
                    || (await utils.search_guild_member(msg, nickname))?.user;
    if (!target) {
        await utils.log_reply(
            msg, `Could not find user matching "${nickname}", please be more specific.`);
        return false;
    }

    if (state.mutes) {
        const target_idx = state.mutes.indexOf(target.id);
        if (target_idx !== -1) {
            state.mutes.splice(target_idx, 1);
            console.log(`Unmuted user ${target.username} in all text channels.`)
            await msg.reply(`Unmuted ${utils.mention(target)} in all text channels.`);
            return true;
        }
    }
    console.log(`User ${target.username} is not muted.`);
    await msg.reply(`${utils.mention(target)} is not muted.`);
    return false;
}

async function role (_state, msg, action, nickname, ...roles) {
    if (!action || !nickname || roles.length < 1) {
        await utils.log_reply(
            msg, 'Usage: ;role <add|remove> @<user> @<role1> [@<role2>...]'
                + ' -- adds the specified roles to, or removes them from, the user.');
        return false;
    }

    const actions = ['add', 'remove'];
    const action_idx = actions.indexOf(action.toLowerCase());
    if (action_idx === -1) {
        await utils.log_reply(msg, `Supported actions are: ${actions.join(', ')}`);
        return false;
    }

    const target = await utils.fetch_guild_member(msg, nickname)
                    || await utils.search_guild_member(msg, nickname);
    if (!target) {
        await utils.log_reply(
            msg, `Could not find user matching "${nickname}", please be more specific.`);
        return false;
    }

    roles = await utils.fetch_roles(msg, roles);
    if (!roles) {
        await utils.log_reply(
            msg, 'One or more roles could not be resolved, please tag them directly.');
        return false;
    }

    // TODO: try/catch
    switch (action_idx) {
        case 0:
            await Promise.all(roles.map(rid => target.roles.add(rid)));
            console.log(`Role(s) added to user ${target.user.username}.`);
            await msg.reply(`Role(s) added to ${utils.mention(target.user)}.`);
            return false;
        case 1:
            await Promise.all(roles.map(rid => target.roles.remove(rid)));
            console.log(`Role(s) removed from user ${target.user.username}.`);
            await msg.reply(`Role(s) removed from ${utils.mention(target.user)}.`);
            return false;
    }
}

async function kick (_state, msg, nickname, ...reason) {
    if (!nickname) {
        await utils.log_reply(
            msg,
            'Usage: ;kick @<user> [reason...]'
                + ' -- removes the user from the server with the specified reason.');
        return false;
    }
    const target = (await utils.fetch_guild_member(msg, nickname))?.user
                    || (await utils.search_guild_member(msg, nickname))?.user;
    if (!target) {
        await utils.log_reply(
            msg, `Could not find server member matching "${nickname}", please be more specific.`);
        return false;
    }

    if (reason) reason = reason.filter(s => s.length > 0).join(' ').trim();
    if (reason.length < 1) reason = 'Kicked by server operator.';

    try {
        await msg.guild.members.kick(target.id, reason);
    } catch {
        console.log(`FISH does not have permission to kick user ${target.username}.`);
        await msg.reply(`FISH does not have permission to kick ${utils.mention(target)}.`);
        return false;
    }
    console.log(`Kicked user ${target.username} with reason: ${reason}`);
    await msg.reply(`Kicked ${utils.mention(target)} with reason: ${reason}`);
    return false;
}

async function ban (_state, msg, nickname, ...reason) {
    if (!nickname) {
        await utils.log_reply(
            msg,
            'Usage: ;ban @<user> [reason...]'
                + ' -- removes the user from the server with the specified reason,'
                + ' and prevents them from re-joining.');
        return false;
    }
    const target = await utils.fetch_user(msg, nickname)
                    || (await utils.search_guild_member(msg, nickname))?.user;
    if (!target) {
        await utils.log_reply(
            msg, `Could not find user matching "${nickname}", please be more specific.`);
        return false;
    }

    if (reason) reason = reason.filter(s => s.length > 0).join(' ').trim();
    if (reason.length < 1) reason = 'Banned by server operator.';

    try {
        await msg.guild.bans.create(target.id, { reason });
    } catch {
        console.log(`FISH does not have permission to ban user ${target.username}.`);
        await msg.reply(`FISH does not have permission to ban ${utils.mention(target)}.`);
        return false;
    }
    console.log(`Banned user ${target.username} with reason: ${reason}`);
    await msg.reply(`Banned ${utils.mention(target)} with reason: ${reason}`);
    return false;
}

async function unban (_state, msg, nickname, ...reason) {
    if (!nickname) {
        await utils.log_reply(
            msg,
            'Usage: ;unban @<user> [reason...]'
                + ' -- enables a banned user to re-join the server with the specified reason.');
        return false;
    }

    const target = await utils.fetch_user(msg, nickname);
    if (!target) {
        await utils.log_reply(
            msg,
            `Non-server members cannot be intuited from nicknames, please tag "${nickname}" directly.`);
        return false;
    }

    if (reason) reason = reason.filter(s => s.length > 0).join(' ').trim();
    if (reason.length < 1) reason = 'Pardoned by server operator.';

    try {
        await msg.guild.bans.remove(target.id, reason);
    } catch {
        console.log(`User ${target.username} is not currently banned.`);
        await msg.reply(`${utils.mention(target)} is not currently banned.`);
        return false;
    }
    console.log(`Unbanned user ${target.username} with reason: ${reason}`);
    await msg.reply(`Unbanned ${utils.mention(target)} with reason: ${reason}`);
    return false;
}

async function invite (_state, msg, nickname) {
    if (!nickname) {
        await utils.log_reply(msg, 'Usage: ;invite @<user> -- invites a user to the server.');
        return false;
    }

    const target = await utils.fetch_user(msg, nickname);
    if (!target) {
        await utils.log_reply(
            msg,
            `Non-server members cannot be intuited from nicknames, please tag "${nickname}" directly.`);
        return false;
    }

    try {
        const invite = await msg.guild.invites.create(
            msg.channelId, { maxAge: 0, maxUses: 1, unique: true });
        await target.send(`You are invited to join ${msg.guild.name}! ${invite.url}`);
    } catch {
        await utils.log_reply(msg, 'Failed to send invite.');
        return false;
    }

    console.log(`Invite to ${msg.guild.name} sent to user ${target.username}.`);
    await msg.reply(`Invite sent to ${utils.mention(target)}.`);
    return false;
}

module.exports = { roll, grant, revoke, check_perms, mute, unmute,
                    role, kick, ban, unban, invite };
