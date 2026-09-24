const form = document.getElementById("loginForm");
const username = document.getElementById("username");
const password = document.getElementById("password");
const errorMessage = document.getElementById("errorMessage");
const togglePassword = document.getElementById("togglePassword");
const loginButton = form.querySelector(".login-btn");

togglePassword.addEventListener("click", () => {
    const isPassword = password.type === "password";
    password.type = isPassword ? "text" : "password";
    togglePassword.textContent = isPassword ? "○" : "◉";
    togglePassword.setAttribute(
        "aria-label",
        isPassword ? "Hide password" : "Show password"
    );
});

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = "block";
}

function hideError() {
    errorMessage.style.display = "none";
}

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const usernameValue = username.value.trim();
    const passwordValue = password.value;

    if (!usernameValue || !passwordValue) {
        showError("Please enter your username and password.");
        return;
    }

    hideError();
    loginButton.disabled = true;
    loginButton.textContent = "Signing In...";

    try {

        const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                username: usernameValue,
                password: passwordValue
            })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            showError(data.message || "Invalid username or password.");
            return;
        }

        window.location.href = data.redirect || "/";

    } catch (error) {

        console.error("Login request failed:", error);
        showError("Unable to reach the server. Please try again.");

    } finally {

        loginButton.disabled = false;
        loginButton.textContent = "Sign In";
    }
});
