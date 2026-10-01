const usersContainer = document.getElementById("users");
const receiverDropdown = document.getElementById("receiverDropdown");
const receiverTrigger = document.getElementById("receiverTrigger");
const receiverLabel = document.getElementById("receiverLabel");
const receiverPanel = document.getElementById("receiverPanel");
const logDateInput = document.getElementById("logDate");

let receivers = [];
let selectedReceiverId = "";
let selectedReceiverName = "";
let selectedDirectory = "";
let selectedDirectoryDownload = "";
let selectedUserDownload = "";
let selectedImeiDownload = "";
let selectedDate = "";
let mappedValues = [];
let mappedType = "user";
let mappedUsers = [];
let mappedImeiDevices = [];

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function getLocalDate(offset = 0) {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    const timezoneOffset = date.getTimezoneOffset() * 60 * 1000;
    return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

function getDownloadData({ userId = "", imei = "", name = "" } = {}) {
    return `data-receiver-id="${escapeHtml(selectedReceiverId)}" data-date="${escapeHtml(selectedDate)}" data-directory="${escapeHtml(selectedDirectory)}" data-directory-download="${escapeHtml(selectedDirectoryDownload)}" data-user-download="${escapeHtml(selectedUserDownload)}" data-imei-download="${escapeHtml(selectedImeiDownload)}"${userId ? ` data-user-id="${escapeHtml(userId)}"` : ""}${imei ? ` data-imei="${escapeHtml(imei)}"` : ""}${name ? ` data-name="${escapeHtml(name)}"` : ""}`;
}

function renderDeviceRows(devices, userId = "", name = "") {
    return devices.length
        ? devices.map((device, index) => `
            <tr class="row">
                <td>${index + 1}</td>
                <td>${escapeHtml(`${device.vehicle_name}(${device.deviceimei})`)}</td>
                <td class="status-cell"><span class="status status-${device.status.toLowerCase()}">${device.status}</span></td>
                <td class="action">
                ${selectedImeiDownload ? `<button class="download" type="button" ${getDownloadData({ userId, imei: device.deviceimei, name })} title="Download ${escapeHtml(device.deviceimei)}">&darr;</button>` : ""}
                </td>
            </tr>`).join("")
        : "<tr><td colspan=\"4\">No devices found.</td></tr>";
}

function renderDeviceTable(devices, userId = "", name = "") {
    return `
        <table class="device">
            <thead>
                <tr>
                    <th style="width:70px">#</th>
                    <th>IMEI / Device Number</th>
                    <th class="status-cell">Status</th>
                    <th class="action">Action</th>
                </tr>
            </thead>
            <tbody>${renderDeviceRows(devices, userId, name)}</tbody>
        </table>`;
}

function attachDownloadHandlers() {
    document.querySelectorAll(".download").forEach((button) => {
        button.addEventListener("click", () => downloadLog(button.dataset));
    });

    document.querySelectorAll(".all").forEach((button) => {
        button.addEventListener("click", () => downloadAll(button.dataset));
    });
}

function renderUsers() {
    if (!selectedReceiverId) {
        usersContainer.innerHTML = "";
        return;
    }

    usersContainer.innerHTML = mappedUsers.map((user) => {
        return `
        <div class="user" data-user-id="${user.id}">
            <div class="user-head">
                <button class="toggle" type="button" data-toggle="${user.id}" aria-label="Toggle ${escapeHtml(user.name)}">&or;</button>
                <div class="user-avatar" aria-hidden="true">${escapeHtml(user.name.charAt(0).toUpperCase())}</div>
                <div class="user-name">${escapeHtml(user.name)}</div>
                <div class="count">${user.devices.length} Devices</div>
                ${selectedUserDownload ? `<button class="all" type="button" ${getDownloadData({ userId: user.id, imei: user.devices.map((device) => device.deviceimei).join(","), name: user.name })}><span>Download All</span></button>` : ""}
            </div>
            <div class="receiver-values" data-values="${user.id}">
                ${renderDeviceTable(user.devices, user.id, user.name)}
            </div>
        </div>`;
    }).join("");

    document.querySelectorAll("[data-toggle]").forEach((toggle) => {
        toggle.addEventListener("click", () => {
            const values = document.querySelector(`[data-values="${toggle.dataset.toggle}"]`);
            values.classList.toggle("hidden");
            toggle.innerHTML = values.classList.contains("hidden") ? "&rsaquo;" : "&or;";
        });
    });

    attachDownloadHandlers();
}

function renderImeiReceiver() {
    usersContainer.innerHTML = `
        <div class="user">
            <div class="user-head">
                <button class="toggle" id="receiverToggle" type="button" aria-label="Toggle ${escapeHtml(selectedReceiverName)}">&or;</button>
                <div class="user-avatar" aria-hidden="true">R</div>
                <div class="user-name">${escapeHtml(selectedReceiverName)}</div>
                <div class="count">${mappedImeiDevices.length} Devices</div>
                ${selectedUserDownload ? `<button class="all" type="button" ${getDownloadData({ userId: mappedImeiDevices.map((device) => device.user_id).filter(Boolean).join(","), imei: mappedImeiDevices.map((device) => device.deviceimei).join(","), name: selectedReceiverName })}><span>Download All</span></button>` : ""}
            </div>
            <div class="receiver-values" id="receiverValues">
                ${renderDeviceTable(mappedImeiDevices, "", selectedReceiverName)}
            </div>
        </div>`;

    document.getElementById("receiverToggle").addEventListener("click", () => {
        const values = document.getElementById("receiverValues");
        values.classList.toggle("hidden");
        document.getElementById("receiverToggle").innerHTML = values.classList.contains("hidden") ? "&rsaquo;" : "&or;";
    });

    attachDownloadHandlers();
}

function renderReceiverOptions() {
    receiverPanel.innerHTML = receivers
        .map(({ id, receiver_name }) => `
            <div class="custom-select-option${String(id) === String(selectedReceiverId) ? " selected" : ""}" role="option" data-id="${id}">${escapeHtml(receiver_name)}</div>`)
        .join("");

    receiverPanel.querySelectorAll(".custom-select-option").forEach((option) => {
        option.addEventListener("click", () => selectReceiver(option.dataset.id, option.textContent));
    });
}

function closeReceiverDropdown() {
    receiverDropdown.classList.remove("open");
    receiverTrigger.setAttribute("aria-expanded", "false");
}

async function loadReceivers() {
    try {
        const response = await fetch("/api/receivers");
        const data = await response.json();

        if (data.success) {
            receivers = data.receivers;
            renderReceiverOptions();
        }
    } catch (error) {
        console.error("Failed to load receivers:", error);
    }
}

async function selectReceiver(id, name) {
    selectedReceiverId = id;
    selectedReceiverName = name;
    receiverLabel.textContent = name;
    renderReceiverOptions();
    closeReceiverDropdown();

    try {
        const response = await fetch(`/api/receivers/${id}`);
        const data = await response.json();

        if (!data.success) {
            return;
        }

        mappedType = data.receiver.type_of_data;
        selectedDirectory = data.receiver.directory ?? "";
        selectedDirectoryDownload = data.receiver.directory_download ?? "";
        selectedUserDownload = data.receiver.user_download ?? "";
        selectedImeiDownload = data.receiver.imei_download ?? "";
        mappedValues = data.receiver.mapped_display || [];
        mappedUsers = data.receiver.mapped_users || [];
        mappedImeiDevices = data.receiver.mapped_imei_devices || [];

        if (mappedType === "imei") {
            renderImeiReceiver();
        } else {
            renderUsers();
        }
    } catch (error) {
        console.error("Failed to load receiver mapping:", error);
    }
}

receiverTrigger.addEventListener("click", () => {
    const isOpen = receiverDropdown.classList.toggle("open");
    receiverTrigger.setAttribute("aria-expanded", String(isOpen));
});

document.addEventListener("click", (event) => {
    if (!receiverDropdown.contains(event.target)) {
        closeReceiverDropdown();
    }
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        closeReceiverDropdown();
    }
});

function downloadLog(data) {
    const date = data.date.replace(/-/g, '_');
    const fileName = `${data.directory}_${data.imei}`.toLowerCase();

    window.location.href = `http://148.113.16.25:7000/download-log?date=${date}&directory=${data.directory}/${data.userId}&fileName=${fileName}`;
}

function downloadAll(data) {
    console.log(`date: ${data.date}`, `imei: ${data.imei}`, `directory: ${data.directory}`, `user: ${data.userId}`, `name: ${data.name}`);
}

logDateInput.min = getLocalDate(-6);
logDateInput.max = getLocalDate();
logDateInput.value = getLocalDate();
selectedDate = logDateInput.value;

logDateInput.addEventListener("change", () => {
    selectedDate = logDateInput.value;

    if (selectedReceiverId) {
        mappedType === "imei" ? renderImeiReceiver() : renderUsers();
    }
});

loadReceivers();
