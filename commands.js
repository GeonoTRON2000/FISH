const utils = require('./utils.js');

/* TODO: role management? */

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

async function op (state, msg, nickname) {
    if (!nickname) {
        await utils.log_reply(msg, 'Usage: ;op @<user>');
        return false;
    }
    const target = await utils.find_nick(msg, nickname);
    if (!target) {
        await utils.log_reply(
            msg, `Could not find user matching "${nickname}", please be more specific.`);
        return false;
    }

    if (!state.operators) state.operators = [];

    if (state.operators.indexOf(target.id) === -1) {
        state.operators.push(target.id);
        console.log(`User ${target.username} is now a server operator.`);
        await msg.reply(`${utils.mention(target)} is now a server operator.`);
        return true;
    } else {
        console.log(`User ${target.username} is already a server operator.`);
        await msg.reply(`${utils.mention(target)} is already a server operator.`);
        return false;
    }
}

async function deop (state, msg, nickname) {
    if (!nickname) {
        await utils.log_reply(msg, 'Usage: ;deop @<user>');
        return false;
    }
    const target = await utils.find_nick(msg, nickname);
    if (!target) {
        await utils.log_reply(
            msg, `Could not find user matching "${nickname}", please be more specific.`);
        return false;
    }

    if (state.operators) {
        const target_idx = state.operators.indexOf(target.id);
        if (target_idx !== -1) {
            state.operators.splice(target_idx, 1);
            console.log(`User ${target.username} is no longer a server operator.`)
            await msg.reply(`${utils.mention(target)} is no longer a server operator.`);
            return true;
        }
    }
    console.log(`User ${target.username} is not a server operator.`);
    await msg.reply(`${utils.mention(target)} is not a server operator.`);
    return false;
}

async function mute (state, msg, nickname) {
    if (!nickname) {
        await utils.log_reply(msg, 'Usage: ;mute @<user>');
        return false;
    }
    const target = await utils.find_nick(msg, nickname);
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
        await utils.log_reply(msg, 'Usage: ;unmute @<user>');
        return false;
    }
    const target = await utils.find_nick(msg, nickname);
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

async function kick (_state, msg, nickname, ...reason) {
    if (!nickname) {
        await utils.log_reply(msg, 'Usage: ;kick @<user> [reason...]');
        return false;
    }
    const target = await utils.find_nick(
        msg, nickname, async uid => (await utils.fetch_id(msg.guild.members, uid))?.user);
    if (!target) {
        await utils.log_reply(
            msg, `Could not find server member matching "${nickname}", please be more specific.`);
        return false;
    }

    if (reason) reason = reason.filter(s => s.length > 0).join(' ').trim();
    if (reason.length < 1) reason = 'Kicked by server operator.';

    await msg.guild.members.kick(target.id, reason);
    console.log(`Kicked user ${target.username} with reason: ${reason}`);
    await msg.reply(`Kicked ${utils.mention(target)} with reason: ${reason}`);
    return false;
}

async function ban (_state, msg, nickname, ...reason) {
    if (!nickname) {
        await utils.log_reply(msg, 'Usage: ;ban @<user> [reason...]');
        return false;
    }
    const target = await utils.find_nick(msg, nickname);
    if (!target) {
        await utils.log_reply(
            msg, `Could not find user matching "${nickname}", please be more specific.`);
        return false;
    }

    if (reason) reason = reason.filter(s => s.length > 0).join(' ').trim();
    if (reason.length < 1) reason = 'Banned by server operator.';

    await msg.guild.bans.create(target.id, { reason });
    console.log(`Banned user ${target.username} with reason: ${reason}`);
    await msg.reply(`Banned ${utils.mention(target)} with reason: ${reason}`);
    return false;
}

async function unban (_state, msg, nickname, ...reason) {
    if (!nickname) {
        await utils.log_reply(msg, 'Usage: ;unban @<user> [reason...]');
        return false;
    }

    const target = await utils.find_banned(msg, nickname);
    if (!target) {
        await utils.log_reply(
            msg, `Banned users cannot be intuited from nicknames, please tag "${nickname}" directly.`);
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

module.exports = { roll, op, deop, mute, unmute, kick, ban, unban };
