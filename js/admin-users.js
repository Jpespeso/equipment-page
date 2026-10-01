// admin-users.js: behavior of admin-users.html (admin only: list accounts, change roles)

(async function () {
    const profile = await initPage(["admin"]);
    if (!profile) return;

    const tbody = document.getElementById("users-body");
    const summary = document.getElementById("users-summary");
    let users = [];

    async function loadUsers() {
        const { data, error } = await db
            .from("profiles")
            .select("id, full_name, email, role, created_at")
            .order("created_at", { ascending: true });

        if (error) {
            tbody.textContent = "";
            showMessage("Could not load the accounts. " + error.message, "error");
            return;
        }
        users = data;
        render();
    }

    function updateSummary() {
        const count = function (role) {
            return users.filter(function (u) { return u.role === role; }).length;
        };
        summary.textContent = users.length + " accounts: " +
            count("admin") + " admin, " + count("staff") + " staff, " + count("user") + " user.";
    }

    function formatDate(value) {
        return new Date(value).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
    }

    function render() {
        tbody.textContent = "";
        updateSummary();

        if (users.length === 0) {
            const row = createEl("tr");
            const cell = createEl("td", "muted");
            cell.colSpan = 5;
            cell.textContent = "No accounts yet.";
            row.appendChild(cell);
            tbody.appendChild(row);
            return;
        }

        users.forEach(function (user) {
            const isSelf = user.id === profile.id;
            const row = createEl("tr");

            const nameCell = createEl("td");
            nameCell.textContent = user.full_name + (isSelf ? " (you)" : "");

            const emailCell = createEl("td");
            emailCell.textContent = user.email;

            const roleCell = createEl("td");
            const select = createEl("select");
            select.setAttribute("aria-label", "Role of " + user.full_name);
            ["admin", "staff", "user"].forEach(function (role) {
                const option = createEl("option");
                option.value = role;
                option.textContent = ROLE_LABELS[role];
                if (role === user.role) option.selected = true;
                select.appendChild(option);
            });
                // Admins cannot change their own role
            select.disabled = isSelf;
            roleCell.appendChild(select);

            const joinedCell = createEl("td");
            joinedCell.textContent = formatDate(user.created_at);

            const actionCell = createEl("td");
            if (isSelf) {
                const note = createEl("span", "muted");
                note.textContent = "Your own role is locked";
                actionCell.appendChild(note);
            } else {
                const save = createEl("button", "btn btn-small");
                save.type = "button";
                save.textContent = "Save";
                save.disabled = true;
                select.addEventListener("change", function () {
                    save.disabled = (select.value === user.role);
                });
                save.addEventListener("click", function () {
                    saveRole(user, select.value, save);
                });
                actionCell.appendChild(save);
            }

            row.append(nameCell, emailCell, roleCell, joinedCell, actionCell);
            tbody.appendChild(row);
        });
    }

    async function saveRole(user, newRole, button) {
        clearMessage();
        button.disabled = true;
        button.textContent = "Saving...";

        // .select() returns the updated row, so we can tell the change really happened
        const { data, error } = await db
            .from("profiles")
            .update({ role: newRole })
            .eq("id", user.id)
            .select("id, role");

        button.textContent = "Save";

        if (error || !data || data.length === 0) {
            showMessage("Could not change the role of " + user.full_name + ". " + (error ? error.message : "The database did not allow the change."), "error");
            button.disabled = false;
            return;
        }

        user.role = data[0].role;
        updateSummary();
        button.disabled = true;
        showMessage(user.full_name + " is now " + ROLE_LABELS[user.role] + ".", "success");
    }

    await loadUsers();
})();
