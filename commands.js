const utils = require('./utils.js');

module.exports = {
    // TODO: kick/ban, mute/unmute, role management, etc.
    auth: async function (state, msg, nickname) {
        if (!nickname) {
            await utils.log_reply(msg, 'Usage: ;auth @<user>');
            return;
        }
        const target = await utils.find_user(msg, nickname);
        if (!target) {
            await utils.log_reply(
                msg, `Could not find user matching "${nickname}", please be more specific.`);
            return;
        }
        if (state.authorized_users.indexOf(target.id) === -1) {
            state.authorized_users.push(target.id);
            console.log(`Authorized user ${target.username} to use fish.`);
            await msg.reply(`Authorized <@${target.id}> to use fish.`);
        } else {
            console.log(`User ${target.username} is already authorized.`);
            await msg.reply(`<@${target.id}> is already authorized.`);
        }
        return;
    },

    deauth: async function (state, msg, nickname) {
        if (!nickname) {
            await utils.log_reply(msg, 'Usage: ;deauth @<user>');
            return;
        }
        const target = await utils.find_user(msg, nickname);
        if (!target) {
            await utils.log_reply(
                msg, `Could not find user matching "${nickname}", please be more specific.`);
            return;
        }
        const target_idx = state.authorized_users.indexOf(target.id);
        if (target_idx !== -1) {
            state.authorized_users.splice(target_idx, 1);
            console.log(`Removed authorization for user ${target.username} to use fish.`)
            await msg.reply(`Removed authorization for <@${target.id}> to use fish.`);
        } else {
            console.log(`User ${target.username} is not authorized.`);
            await msg.reply(`<@${target.id}> is not authorized.`);
        }
        return;
    }
};
