const usersContainer = document.getElementById("users");
const receiverDropdown = document.getElementById("receiverDropdown");
const receiverTrigger = document.getElementById("receiverTrigger");
const receiverLabel = document.getElementById("receiverLabel");
const receiverPanel = document.getElementById("receiverPanel");

let receivers = [];
let selectedReceiverId = "";
let selectedReceiverName = "";
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

function renderDeviceRows(devices) {
    return devices.length
        ? devices.map((device, index) => `
            <tr class="row">
                <td>${index + 1}</td>
                <td>${escapeHtml(`${device.vehicle_name}(${device.deviceimei})`)}</td>
                <td class="status-cell"><span class="status status-${device.status.toLowerCase()}">${device.status}</span></td>
                <td class="action"><button class="download" type="button" data-value="${escapeHtml(device.deviceimei)}" title="Download ${escapeHtml(device.deviceimei)}">&darr;</button></td>
            </tr>`).join("")
        : "<tr><td colspan=\"4\">No devices found.</td></tr>";
}

function renderDeviceTable(devices) {
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
            <tbody>${renderDeviceRows(devices)}</tbody>
        </table>`;
}

function attachDownloadHandlers() {
    document.querySelectorAll(".download").forEach((button) => {
        button.addEventListener("click", () => downloadLog(button.dataset.value));
    });

    document.querySelectorAll(".all").forEach((button) => {
        button.addEventListener("click", () => downloadAll(button.dataset.name));
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
                <button class="all" type="button" data-name="${escapeHtml(user.name)}"><span>Download All</span></button>
            </div>
            <div class="receiver-values" data-values="${user.id}">
                ${renderDeviceTable(user.devices)}
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
                <button class="all" type="button" data-name="${escapeHtml(selectedReceiverName)}"><span>Download All</span></button>
            </div>
            <div class="receiver-values" id="receiverValues">
                ${renderDeviceTable(mappedImeiDevices)}
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

function downloadLog(imei) {
    alert(`Download log: ${imei}`);
}

function downloadAll(name) {
    alert(`Download all logs for ${name}`);
}

loadReceivers();
