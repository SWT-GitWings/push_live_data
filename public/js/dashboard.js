const userList = document.getElementById("userList");
const addUserBtn = document.getElementById("addUser");
const removeLastBtn = document.getElementById("removeLast");
const clearBtn = document.getElementById("clearBtn");
const saveBtn = document.getElementById("saveBtn");
const receiver = document.getElementById("receiver");
const mappedHeading = document.getElementById("mappedHeading");

let users = [];

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

        data.receivers.forEach(({ id, receiver_name }) => {
            const option = document.createElement("option");
            option.value = id;
            option.textContent = receiver_name;
            receiver.appendChild(option);
        });

    } catch (error) {
        console.error("Failed to load receivers:", error);
    }
}

async function loadReceiverMapping(id) {
    try {
        const response = await fetch(`/api/receivers/${id}`);
        const data = await response.json();

        if (!data.success) {
            return;
        }

        const { type_of_data, mapped_display } = data.receiver;
        const isUser = type_of_data === "user";

        mappedHeading.textContent = isUser ? "Users" : "IMEI";

        users = mapped_display || [];

        renderUsers();

    } catch (error) {
        console.error("Failed to load receiver mapping:", error);
    }
}

receiver.addEventListener("change", () => {
    if (!receiver.value) {
        mappedHeading.textContent = "Users";
        users = [];
        renderUsers();
        return;
    }

    loadReceiverMapping(receiver.value);
});


addUserBtn.addEventListener("click", () => {
    users.unshift("");
    renderUsers();

    const inputs = document.querySelectorAll(".user-input");
    inputs[0]?.focus();
});

removeLastBtn.addEventListener("click", () => {
    if (users.length > 0) {
        users.shift();
        renderUsers();
    }
});

clearBtn.addEventListener("click", () => {
    receiver.value = "";
    mappedHeading.textContent = "Users";
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
