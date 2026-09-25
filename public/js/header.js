/*
|--------------------------------------------------------------------------
| Shared header logic (current user + logout) used by all protected pages
|--------------------------------------------------------------------------
*/

const headerUsername = document.getElementById("headerUsername");
const logoutBtn = document.getElementById("logoutBtn");

async function loadCurrentUser() {
  try {
    const response = await fetch("/api/auth/me");
    const data = await response.json();

    if (!data.success) {
      return;
    }

    headerUsername.textContent = data.user.name || data.user.username || "";
  } catch (error) {
    console.error("Failed to load current user:", error);
  }
}

logoutBtn.addEventListener("click", async () => {
  logoutBtn.disabled = true;

  try {
    const response = await fetch("/api/auth/logout", { method: "POST" });
    const data = await response.json();

    window.location.href = data.redirect || "/login";
  } catch (error) {
    console.error("Logout failed:", error);
    logoutBtn.disabled = false;
  }
});

loadCurrentUser();
