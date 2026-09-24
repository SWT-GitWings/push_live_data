const userList = document.getElementById("userList");
const addUserBtn = document.getElementById("addUser");
const removeLastBtn = document.getElementById("removeLast");
const clearBtn = document.getElementById("clearBtn");
const saveBtn = document.getElementById("saveBtn");
const receiver = document.getElementById("receiver");

let users = [
    "Sam",
    "Sam",
    "Sam",
    "Sam",
    "Sam",
    "Sam",
    "Sam"
];

function renderUsers() {
    userList.innerHTML = "";

    if (users.length === 0) {
        userList.innerHTML = `
        <div class="empty">
            No mapped users. Click <strong>+</strong> to add a user.
        </div>
    `;
        return;
    }

    users.forEach((user, index) => {
        const row = document.createElement("div");
        row.className = "user-row";

        row.innerHTML = `
        <div class="user-number">${index + 1}</div>

        <div>
            <input
                class="user-input"
                type="text"
                value="${escapeHtml(user)}"
                placeholder="Search / enter user"
                data-index="${index}"
                aria-label="Mapped user ${index + 1}"
            >
        </div>

        <button
            class="delete-btn"
            type="button"
            data-delete="${index}"
            title="Remove user"
            aria-label="Remove user ${index + 1}"
        ><img class="tab-icon" src="/public/images/trash_icon.svg" alt=""></img></button>
    `;

        userList.appendChild(row);
    });

    document.querySelectorAll(".user-input").forEach(input => {
        input.addEventListener("input", event => {
            users[event.target.dataset.index] = event.target.value;
        });
    });

    document.querySelectorAll("[data-delete]").forEach(button => {
        button.addEventListener("click", event => {
            const index = Number(event.currentTarget.dataset.delete);
            users.splice(index, 1);
            renderUsers();
        });
    });
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

async function loadReceivers() {
    try {
        const response = await fetch("/api/receivers");
        const data = await response.json();

        if (!data.success) {
            return;
        }

        data.receivers.forEach(name => {
            const option = document.createElement("option");
            option.value = name;
            option.textContent = name;
            receiver.appendChild(option);
        });

    } catch (error) {
        console.error("Failed to load receivers:", error);
    }
}


addUserBtn.addEventListener("click", () => {
    users.push("");
    renderUsers();

    const inputs = document.querySelectorAll(".user-input");
    inputs[inputs.length - 1]?.focus();
});

removeLastBtn.addEventListener("click", () => {
    if (users.length > 0) {
        users.pop();
        renderUsers();
    }
});

clearBtn.addEventListener("click", () => {
    receiver.value = "";
    users = [];
    renderUsers();
});

saveBtn.addEventListener("click", () => {
    if (!receiver.value) {
        alert("Please select a receiver.");
        receiver.focus();
        return;
    }

    const validUsers = users
        .map(user => user.trim())
        .filter(Boolean);

    if (validUsers.length === 0) {
        alert("Please add at least one mapped user.");
        return;
    }

    console.log({
        receiver: receiver.value,
        mappedUsers: validUsers
    });

    alert("Push Live Data configuration saved.");
});

renderUsers();
loadReceivers();
