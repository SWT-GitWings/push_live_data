/*
|--------------------------------------------------------------------------
| Mines Push page logic - backed by /api/mines (mines_offline_push_api)
|--------------------------------------------------------------------------
*/

const mineForm = document.getElementById("mineForm");
const searchInput = document.getElementById("search");
const recordsBody = document.getElementById("recordsBody");
const recordInfo = document.getElementById("recordInfo");
const resetBtn = document.getElementById("resetBtn");
const saveBtn = document.getElementById("saveBtn");
const imeiInput = document.getElementById("imei");
const startTimeInput = document.getElementById("startTime");
const endTimeInput = document.getElementById("endTime");
const suggestionPanel = document.getElementById("sharedSuggestionPanel");

let records = [];
let editingId = null;
let searchTimer = null;
let imeiSuggestions = [];
let imeiSuggestionTimer = null;

const MIN_DURATION_MINUTES = 1;
const MAX_DURATION_MINUTES = 15;

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function pad(value) {
  return String(value).padStart(2, "0");
}

// "2026-09-01T10:00" (datetime-local) <-> "2026-09-01 10:00:00" (MySQL)
function toDatetimeLocal(value) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) {
    return "";
  }
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toMysqlDatetime(localValue) {
  return `${localValue.replace("T", " ")}:00`;
}

function formatDisplayDate(value) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) {
    return escapeHtml(value || "");
  }
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function getDurationMinutes(startValue, endValue) {
  return (new Date(endValue) - new Date(startValue)) / 60000;
}

/*
|--------------------------------------------------------------------------
| IMEI autosearch - reuses the same /api/receivers/search/imei suggestions
| used by the Push Live Data page (min 4 characters).
|--------------------------------------------------------------------------
*/

function positionSuggestionPanel(input) {
  const rect = input.getBoundingClientRect();

  suggestionPanel.style.left = `${rect.left}px`;
  suggestionPanel.style.width = `${rect.width}px`;
  suggestionPanel.style.bottom = `${window.innerHeight - rect.top + 6}px`;
}

function closeImeiSuggestions() {
  suggestionPanel.classList.remove("open");
}

function renderImeiSuggestions() {
  if (imeiSuggestions.length === 0) {
    suggestionPanel.innerHTML = `<div class="user-suggestion-empty">No matches found</div>`;
  } else {
    suggestionPanel.innerHTML = imeiSuggestions
      .map(
        (item, index) =>
          `<div class="user-suggestion-option" data-index="${index}">${escapeHtml(item.label)}</div>`,
      )
      .join("");

    suggestionPanel
      .querySelectorAll(".user-suggestion-option")
      .forEach((option) => {
        option.addEventListener("click", () => {
          const item = imeiSuggestions[Number(option.dataset.index)];
          if (!item) {
            return;
          }

          imeiInput.value = item.value;
          closeImeiSuggestions();
        });
      });
  }

  positionSuggestionPanel(imeiInput);
  suggestionPanel.classList.add("open");
}

async function searchImeiSuggestions(query) {
  try {
    const response = await fetch(
      `/api/receivers/search/imei?q=${encodeURIComponent(query)}`,
    );
    const data = await response.json();

    if (!data.success) {
      return;
    }

    imeiSuggestions = data.results;
    renderImeiSuggestions();
  } catch (error) {
    console.error("Failed to fetch IMEI suggestions:", error);
  }
}

imeiInput.addEventListener("input", () => {
  const query = imeiInput.value.trim();
  clearTimeout(imeiSuggestionTimer);

  if (query.length <= 3) {
    closeImeiSuggestions();
    return;
  }

  imeiSuggestionTimer = setTimeout(() => searchImeiSuggestions(query), 250);
});

imeiInput.addEventListener("focus", () => {
  if (imeiInput.value.trim().length > 3 && imeiSuggestions.length) {
    renderImeiSuggestions();
  }
});

document.addEventListener("click", (event) => {
  if (
    !event.target.closest(".user-input-wrap") &&
    !event.target.closest("#sharedSuggestionPanel")
  ) {
    closeImeiSuggestions();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeImeiSuggestions();
  }
});

window.addEventListener("resize", closeImeiSuggestions);

/*
|--------------------------------------------------------------------------
| Keep the End Time picker from allowing a value before Start Time.
|--------------------------------------------------------------------------
*/

startTimeInput.addEventListener("change", () => {
  endTimeInput.min = startTimeInput.value;
});

async function fetchRecords() {
  const query = searchInput.value.trim();

  try {
    const url = query ? `/api/mines?search=${encodeURIComponent(query)}` : "/api/mines";
    const response = await fetch(url);
    const data = await response.json();

    if (!data.success) {
      recordInfo.textContent = data.message || "Failed to load records.";
      return;
    }

    records = data.records;
    renderRecords();
  } catch (error) {
    console.error("Failed to fetch mines push records:", error);
    recordInfo.textContent = "Failed to load records.";
  }
}

function renderRecords() {
  if (records.length === 0) {
    recordsBody.innerHTML = `<tr><td colspan="8" class="empty">No mines push records found.</td></tr>`;
    recordInfo.textContent = "Showing 0 records";
    return;
  }

  recordsBody.innerHTML = records
    .map(
      (record, index) => `
        <tr>
            <td>${index + 1}</td>
            <td><strong>${escapeHtml(record.imei)}</strong></td>
            <td>${escapeHtml(record.latitude)}</td>
            <td>${escapeHtml(record.longitude)}</td>
            <td>${formatDisplayDate(record.start_time)}</td>
            <td>${formatDisplayDate(record.end_time)}</td>
            <td>
                <span class="status ${record.active_status ? "active" : "inactive"}">
                    ${record.active_status ? "Active" : "Inactive"}
                </span>
            </td>
            <td>
                <div class="action-cell">
                    <button class="icon-btn edit" type="button" title="Update" data-edit="${record.id}">✎</button>
                    <button class="icon-btn ${record.active_status ? "deactivate" : "activate"}" type="button" title="${record.active_status ? "Deactivate" : "Activate"}" data-toggle="${record.id}">⏻</button>
                </div>
            </td>
        </tr>
      `,
    )
    .join("");

  recordInfo.textContent = `Showing ${records.length} record${records.length === 1 ? "" : "s"}`;

  recordsBody.querySelectorAll("[data-edit]").forEach((button) => {
    button.addEventListener("click", () =>
      editRecord(Number(button.dataset.edit)),
    );
  });

  recordsBody.querySelectorAll("[data-toggle]").forEach((button) => {
    button.addEventListener("click", () =>
      toggleStatus(Number(button.dataset.toggle)),
    );
  });
}

function editRecord(id) {
  const record = records.find((item) => item.id === id);
  if (!record) {
    return;
  }

  editingId = id;

  document.getElementById("imei").value = record.imei;
  document.getElementById("latitude").value = record.latitude;
  document.getElementById("longitude").value = record.longitude;
  document.getElementById("startTime").value = toDatetimeLocal(record.start_time);
  document.getElementById("endTime").value = toDatetimeLocal(record.end_time);
  document.getElementById("activeStatus").value = record.active_status ? "1" : "0";
  endTimeInput.min = startTimeInput.value;

  saveBtn.innerHTML = `<img class="tab-icon" src="/public/images/save_icon.svg" alt=""> Update`;

  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function toggleStatus(id) {
  const record = records.find((item) => item.id === id);
  if (!record) {
    return;
  }

  const action = record.active_status ? "deactivate" : "activate";

  if (!confirm(`Are you sure you want to ${action} IMEI ${record.imei}?`)) {
    return;
  }

  try {
    const response = await fetch(`/api/mines/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active_status: record.active_status ? 0 : 1 }),
    });

    const data = await response.json();

    if (!data.success) {
      alert(data.message || "Failed to update status.");
      return;
    }

    fetchRecords();
  } catch (error) {
    console.error("Failed to toggle mines push status:", error);
    alert("Failed to update status.");
  }
}

function resetForm() {
  mineForm.reset();
  document.getElementById("activeStatus").value = "1";
  editingId = null;
  saveBtn.innerHTML = `<img class="tab-icon" src="/public/images/save_icon.svg" alt=""> Save`;
}

mineForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const imei = document.getElementById("imei").value.trim();
  const latitude = document.getElementById("latitude").value.trim();
  const longitude = document.getElementById("longitude").value.trim();
  const startTime = document.getElementById("startTime").value;
  const endTime = document.getElementById("endTime").value;
  const activeStatus = document.getElementById("activeStatus").value === "1" ? 1 : 0;

  if (!imei || !latitude || !longitude || !startTime || !endTime) {
    alert("Please fill all required fields.");
    return;
  }

  if (!Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))) {
    alert("Latitude and longitude must be valid numbers.");
    return;
  }

  const durationMinutes = getDurationMinutes(startTime, endTime);

  if (durationMinutes < 0) {
    alert("End time cannot be earlier than start time.");
    return;
  }

  if (durationMinutes <= MIN_DURATION_MINUTES) {
    alert(
      `Duration between start time and end time must be greater than ${MIN_DURATION_MINUTES} minute.`,
    );
    return;
  }

  if (durationMinutes >= MAX_DURATION_MINUTES) {
    alert(
      `Duration between start time and end time must be less than ${MAX_DURATION_MINUTES} minutes.`,
    );
    return;
  }

  const payload = {
    imei,
    latitude: Number(latitude),
    longitude: Number(longitude),
    start_time: toMysqlDatetime(startTime),
    end_time: toMysqlDatetime(endTime),
    active_status: activeStatus,
  };

  const isEditing = Boolean(editingId);

  try {
    const response = isEditing
      ? await fetch(`/api/mines/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      : await fetch("/api/mines", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

    const data = await response.json();

    if (!data.success) {
      alert(data.message || "Failed to save mines push record.");
      return;
    }

    resetForm();
    fetchRecords();

    alert(`Mines push record ${isEditing ? "updated" : "saved"} successfully.`);
  } catch (error) {
    console.error("Failed to save mines push record:", error);
    alert("Failed to save mines push record.");
  }
});

resetBtn.addEventListener("click", resetForm);

searchInput.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(fetchRecords, 250);
});

fetchRecords();
