// auth.js: login, sign-up, logout, role check, and the shared header and menu.
// Use in a page:  const profile = await initPage(["admin", "staff"]);  if (!profile) return;

const ROLE_LABELS = { admin: "Admin", staff: "Staff", user: "User" };

// Menu for each role
const NAV_LINKS = {
    admin: [
        { href: "dashboard.html", label: "Dashboard" },
        { href: "equipment.html", label: "Equipment" },
        { href: "transactions.html", label: "Transactions" },
        { href: "reports.html", label: "Reports" },
        { href: "admin-users.html", label: "Users" }
    ],
    staff: [
        { href: "dashboard.html", label: "Dashboard" },
        { href: "equipment.html", label: "Equipment" },
        { href: "transactions.html", label: "Transactions" },
        { href: "reports.html", label: "Reports" }
    ],
    user: [
        { href: "dashboard.html", label: "Dashboard" },
        { href: "equipment.html", label: "Equipment" }
    ]
};

// Helpers
function createEl(tag, className) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    return node;
}

function showMessage(text, type) {
    const box = document.getElementById("message");
    if (!box) return;
    box.textContent = text;
    box.className = "msg msg-" + (type || "info");
    box.hidden = false;
}

function clearMessage() {
    const box = document.getElementById("message");
    if (box) {
        box.textContent = "";
        box.hidden = true;
    }
}

function setFlash(text, type) {
    try {
        sessionStorage.setItem("flash", JSON.stringify({ text: text, type: type || "info" }));
    } catch (e) {  }
}

function showFlash() {
    try {
        const raw = sessionStorage.getItem("flash");
        if (!raw) return;
        sessionStorage.removeItem("flash");
        const flash = JSON.parse(raw);
        showMessage(flash.text, flash.type);
    } catch (e) {  }
}

function friendlyAuthError(error) {
    const text = (error && error.message) ? error.message : "";
    if (/invalid login credentials/i.test(text)) return "The email or password is incorrect.";
    if (/email not confirmed/i.test(text)) return "Confirm your email first. Open the link we sent to your inbox, then log in.";
    if (/already registered/i.test(text)) return "That email is already registered. Log in instead.";
    if (/password should be at least/i.test(text)) return "The password is too short. Use at least 8 characters.";
    if (/rate limit/i.test(text)) return "Too many attempts. Wait a few minutes and try again.";
    if (/failed to fetch|network/i.test(text)) return "Cannot reach the server. Check your internet connection.";
    return text || "Something went wrong. Try again.";
}

function assertConfigured() {
    if (isConfigured()) return true;
    const text = "Supabase is not connected yet. Open js/supabaseClient.js and paste your project URL and publishable key.";
    if (document.getElementById("message")) {
        showMessage(text, "error");
    } else {
        alert(text);
    }
    return false;
}

// Sign in, sign up, log out
async function signIn(email, password) {
    const { error } = await db.auth.signInWithPassword({ email: email, password: password });
    if (error) return { ok: false, message: friendlyAuthError(error) };
    return { ok: true };
}

async function signUp(fullName, email, password) {
    const { data, error } = await db.auth.signUp({
        email: email,
        password: password,
        options: { data: { full_name: fullName } }
    });
    if (error) return { ok: false, message: friendlyAuthError(error) };

    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        return { ok: false, message: "That email is already registered. Log in instead." };
    }
    return { ok: true, needsConfirmation: !data.session };
}

async function logout() {
    await db.auth.signOut();
    window.location.replace("index.html");
}

// Current user
async function getCurrentProfile() {
    const { data: sessionData, error: sessionError } = await db.auth.getSession();
    if (sessionError || !sessionData.session) return null;

    const { data, error } = await db
        .from("profiles")
        .select("id, full_name, email, role")
        .eq("id", sessionData.session.user.id)
        .single();
    if (error || !data) return null;
    return data;
}

async function redirectIfLoggedIn() {
    const profile = await getCurrentProfile();
    if (profile) window.location.replace("dashboard.html");
}

// Page guard: checks login and role, then draws the header
async function initPage(allowedRoles) {
    if (!assertConfigured()) return null;

    const profile = await getCurrentProfile();
    if (!profile) {
        await db.auth.signOut();
        setFlash("Log in to continue.", "info");
        window.location.replace("index.html");
        return null;
    }

    if (allowedRoles && !allowedRoles.includes(profile.role)) {
        setFlash("Your account does not have access to that page.", "error");
        window.location.replace("dashboard.html");
        return null;
    }

    renderHeader(profile);
    showFlash();
    return profile;
}

// Header and menu
function renderHeader(profile) {
    const header = document.getElementById("app-header");
    if (!header) return;
    header.textContent = "";
    header.className = "app-header";

    const inner = createEl("div", "app-header-inner");

    const brand = createEl("a", "brand");
    brand.href = "dashboard.html";
    brand.textContent = "CISTM Equipment Inventory";

    const nav = createEl("nav", "app-nav");
    nav.setAttribute("aria-label", "Main menu");
    const current = window.location.pathname.split("/").pop() || "index.html";
    (NAV_LINKS[profile.role] || NAV_LINKS.user).forEach(function (link) {
        const a = createEl("a");
        a.href = link.href;
        a.textContent = link.label;
        if (link.href === current) a.setAttribute("aria-current", "page");
        nav.appendChild(a);
    });

    const account = createEl("div", "account");
    const name = createEl("span", "account-name");
    name.textContent = profile.full_name;
    const badge = createEl("span", "badge badge-" + profile.role);
    badge.textContent = ROLE_LABELS[profile.role] || profile.role;
    const button = createEl("button", "btn btn-ghost btn-small");
    button.type = "button";
    button.textContent = "Log out";
    button.addEventListener("click", logout);
    account.append(name, badge, button);

    inner.append(brand, nav, account);
    header.appendChild(inner);
}
