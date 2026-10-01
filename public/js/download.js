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

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function render() {
    if (!selectedReceiverId) {
        usersContainer.innerHTML = "";
        return;
    }

    const valueLabel = mappedType === "imei" ? "IMEI / Device Number" : "User";
    const sectionLabel = mappedType === "imei" ? "Devices" : "Users";
    const rows = mappedValues.length
        ? mappedValues.map((item, index) => `
            <tr class="row">
                <td>${index + 1}</td>
                <td>${escapeHtml(item.label || item.value)}</td>
                <td class="action"><button class="download" type="button" data-value="${escapeHtml(item.value)}" title="Download ${escapeHtml(item.label || item.value)}">&darr;</button></td>
            </tr>`).join("")
        : `<tr><td colspan="3">No mapped ${sectionLabel.toLowerCase()} found.</td></tr>`;

    usersContainer.innerHTML = `
        <div class="user">
            <div class="user-head">
                <button class="toggle" id="receiverToggle" type="button" aria-label="Toggle ${escapeHtml(selectedReceiverName)}">&or;</button>
                <div class="user-avatar" aria-hidden="true">R</div>
                <div class="user-name">${escapeHtml(selectedReceiverName)}</div>
                <div class="count">${mappedValues.length} ${sectionLabel}</div>
                <button class="all" id="downloadAll" type="button"><span>Download All</span></button>
            </div>
            <div id="receiverValues">
                <table class="device">
                    <thead>
                        <tr>
                            <th style="width:70px">#</th>
                            <th>${valueLabel}</th>
                            <th class="action">Action</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>`;

    document.getElementById("receiverToggle").addEventListener("click", () => {
        const values = document.getElementById("receiverValues");
        values.classList.toggle("hidden");
        document.getElementById("receiverToggle").innerHTML = values.classList.contains("hidden") ? "&rsaquo;" : "&or;";
    });

    document.querySelectorAll(".download").forEach((button) => {
        button.addEventListener("click", () => downloadLog(button.dataset.value));
    });

    document.getElementById("downloadAll").addEventListener("click", downloadAll);
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
        render();
    } catch (error) {
        console.error("Failed to load receiver mapping:", error);
    }
}

function downloadLog(value) {
    alert(`Download log: ${value}`);
}

function downloadAll() {
    alert(`Download all logs for ${selectedReceiverName}`);
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

loadReceivers();
