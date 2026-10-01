// signup.js: behavior of signup.html

(async function () {
    const form = document.getElementById("signup-form");
    const button = document.getElementById("signup-button");

    if (!assertConfigured()) return;
    await redirectIfLoggedIn();

    form.addEventListener("submit", async function (event) {
        event.preventDefault();
        clearMessage();

        const fullName = form.full_name.value.trim();
        const email = form.email.value.trim();
        const password = form.password.value;
        const confirm = form.confirm.value;

        if (!fullName || !email || !password || !confirm) {
            showMessage("Fill in every field.", "error");
            return;
        }
        if (password.length < 8) {
            showMessage("The password must have at least 8 characters.", "error");
            return;
        }
        if (password !== confirm) {
            showMessage("The two passwords do not match.", "error");
            return;
        }

        button.disabled = true;
        button.textContent = "Creating account...";

        const result = await signUp(fullName, email, password);
        if (!result.ok) {
            showMessage(result.message, "error");
            button.disabled = false;
            button.textContent = "Create account";
            return;
        }

        if (result.needsConfirmation) {
            form.reset();
            showMessage("Account created. Open the confirmation link sent to " + email + ", then log in.", "success");
            button.disabled = false;
            button.textContent = "Create account";
            return;
        }

        setFlash("Account created. Welcome!", "success");
        window.location.replace("dashboard.html");
    });
})();
