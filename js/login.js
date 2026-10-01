// login.js: behavior of index.html

(async function () {
    const form = document.getElementById("login-form");
    const button = document.getElementById("login-button");

    showFlash();
    if (!assertConfigured()) return;

    await redirectIfLoggedIn();

    form.addEventListener("submit", async function (event) {
        event.preventDefault();
        clearMessage();

        const email = form.email.value.trim();
        const password = form.password.value;

        if (!email || !password) {
            showMessage("Enter your email and password.", "error");
            return;
        }

        button.disabled = true;
        button.textContent = "Logging in...";

        const result = await signIn(email, password);
        if (!result.ok) {
            showMessage(result.message, "error");
            button.disabled = false;
            button.textContent = "Log in";
            return;
        }

        window.location.replace("dashboard.html");
    });
})();
