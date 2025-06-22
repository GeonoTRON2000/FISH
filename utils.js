const fs = require('fs');

module.exports = {
    load_config: function () {
        return require('./config.js');
    },
    load_commands: function () {
        return require('./commands.js');
    },
    load_state: async function () {
        try {
            const state = JSON.parse(await fs.readFile('state.json'));
            console.log('State loaded successfully.');
            return state;
        } catch {
            console.warn('[WARNING] Unable to load state file, starting fresh.');
            return {};
        }
    },
    save_state: async function (state) {
        try {
            await fs.writeFile('state.json', JSON.stringify(state));
            console.log('State saved successfully.');
        } catch {
            console.warn('[WARNING] Unable to save state file, a crash may result in data loss.');
        }
    },
    log_reply: async function (msg, output) {
        console.log(output);
        await msg.reply(output);
    },
    find_user: async function (msg, nickname) {
        if (nickname.startsWith('<@') && nickname.endsWith('>')) {
            try {
                return (await msg.guild.members.fetch(
                    { user: nickname.substring(2, nickname.length - 1) })).user;
            } catch {
                return false;
            }
        }

        const guild_members = await msg.guild.members.fetch({ query: nickname, limit: 2 });

        for (const guild_member of guild_members.values()) {
            if (guild_members.size === 1
                || guild_member.user.username === nickname
                || guild_member.user.id === nickname)
                return guild_member.user;
        }
        return false;
    },
    timestamp: function () {
        const date = new Date();
        return `${date.getHours()}:${date.getMinutes()}`;
    }
};
