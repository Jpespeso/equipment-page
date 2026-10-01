// dashboard.js: behavior of dashboard.html (open to every role, tiles depend on the role)

const ROLE_SUMMARY = {
    admin: "You can manage accounts, equipment records, transactions, and reports.",
    staff: "You can update equipment records and log borrowed and returned equipment.",
    user: "You can check which laboratory equipment is available."
};

const TILE_TEXT = {
    "equipment.html": {
        title: "Equipment",
        text: "Add, edit, and update the condition and status of equipment.",
        userText: "See which equipment is available, in use, or under repair."
    },
    "transactions.html": {
        title: "Transactions",
        text: "Log equipment that is borrowed or returned."
    },
    "reports.html": {
        title: "Reports",
        text: "View the inventory summary by status and category."
    },
    "admin-users.html": {
        title: "Users",
        text: "See every account and change its role."
    }
};

(async function () {
    const profile = await initPage();
    if (!profile) return;

    const firstName = profile.full_name.trim().split(/\s+/)[0];
    document.getElementById("welcome").textContent = "Welcome, " + firstName;

    const badge = document.getElementById("role-badge");
    badge.textContent = ROLE_LABELS[profile.role] || profile.role;
    badge.className = "badge badge-" + profile.role;
    badge.hidden = false;

    document.getElementById("role-summary").textContent = ROLE_SUMMARY[profile.role] || "";

    const tiles = document.getElementById("tiles");
    (NAV_LINKS[profile.role] || []).forEach(function (link) {
        const info = TILE_TEXT[link.href];
        if (!info) return;

        const tile = createEl("a", "tile");
        tile.href = link.href;

        const title = createEl("h2");
        title.textContent = info.title;

        const text = createEl("p");
        text.textContent = (profile.role === "user" && info.userText) ? info.userText : info.text;

        tile.append(title, text);
        tiles.appendChild(tile);
    });
})();
