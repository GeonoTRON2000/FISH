const ALL = '*';
const BYPASS_MUTE = 'bypass_mute';

function view (state, uid) {
    if (!state.permissions || !(uid in state.permissions))
        return [];
    return Object.keys(state.permissions[uid]).filter(
            permission => state.permissions[uid][permission]);
}

/* Returns: whether the user has the permission. */
function check (state, uid, permission) {
    if (!state.permissions || !(uid in state.permissions))
        return false;
    if (ALL in state.permissions[uid] && state.permissions[uid][ALL])
        return true;

    return permission in state.permissions[uid]
            && state.permissions[uid][permission];
}

/* Returns: whether state was modified. */
function grant (state, uid, permission) {
    if (!state.permissions)
        state.permissions = {};
    if (!(uid in state.permissions))
        state.permissions[uid] = {};
    if (!(permission in state.permissions[uid])
            || !state.permissions[uid][permission]) {
        state.permissions[uid][permission] = true;
        return true;
    }
    return false;
}

/* Returns: whether state was modified. */
function revoke (state, uid, permission) {
    if (!state.permissions || !(uid in state.permissions)
            || !(permission in state.permissions[uid])
            || !state.permissions[uid][permission])
        return false;

    delete state.permissions[uid][permission];
    return true;
}

module.exports = { view, check, grant, revoke,
                    ALL, BYPASS_MUTE };
