const userList = document.getElementById("userList");
const addUserBtn = document.getElementById("addUser");
const removeLastBtn = document.getElementById("removeLast");
const clearBtn = document.getElementById("clearBtn");
const saveBtn = document.getElementById("saveBtn");
const receiverDropdown = document.getElementById("receiverDropdown");
const receiverTrigger = document.getElementById("receiverTrigger");
const receiverLabel = document.getElementById("receiverLabel");
const receiverPanel = document.getElementById("receiverPanel");
const mappedHeading = document.getElementById("mappedHeading");
const suggestionPanel = document.getElementById("sharedSuggestionPanel");
const headerUsername = document.getElementById("headerUsername");
const logoutBtn = document.getElementById("logoutBtn");

let users = [];
let currentType = "user";
let receivers = [];
let selectedReceiverId = "";
let activeSuggestionIndex = null;
const suggestionTimers = {};
const suggestionCache = {};

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

        <div class="user-input-wrap">
            <input
                class="user-input"
                type="text"
                value="${escapeHtml(user.label ?? "")}"
                placeholder="Search / enter user"
                data-index="${index}"
                autocomplete="off"
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

  document.querySelectorAll(".user-input").forEach((input) => {
    input.addEventListener("input", (event) => {
      const index = event.target.dataset.index;
      const label = event.target.value;
      const matched = suggestionCache[index]?.find(
        (item) => item.label === label,
      );

      users[index] = { value: matched ? matched.value : null, label };

      const query = label.trim();
      if (query.length > 3) {
        updateSuggestions(index, query);
      } else {
        closeSuggestions();
      }

      highlightDuplicates();
    });

    input.addEventListener("focus", (event) => {
      const index = event.target.dataset.index;
      if (suggestionCache[index]?.length) {
        openSuggestionsFor(index);
      }
    });
  });

  document.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", (event) => {
      const index = Number(event.currentTarget.dataset.delete);
      users.splice(index, 1);
      renderUsers();
    });
  });

  highlightDuplicates();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/*
|--------------------------------------------------------------------------
| Resolve the raw id/imei to persist for a mapped row.
| Falls back to the trailing "(...)" segment for imei (label already holds
| the raw imei), or the typed text itself when no suggestion was selected.
|--------------------------------------------------------------------------
*/

function resolveRawValue(user) {
  const label = (user.label || "").trim();

  if (!label) {
    return null;
  }

  if (user.value) {
    return String(user.value).trim();
  }

  const match = label.match(/\(([^()]+)\)\s*$/);
  if (currentType === "imei" && match) {
    return match[1].trim();
  }

  return label;
}

/*
|--------------------------------------------------------------------------
| Find rows whose resolved raw value repeats elsewhere in the list.
|--------------------------------------------------------------------------
*/

function findDuplicateIndexes() {
  const seen = new Map();
  const duplicates = new Set();

  users.forEach((user, index) => {
    const raw = resolveRawValue(user);

    if (!raw) {
      return;
    }

    const key = raw.toLowerCase();

    if (seen.has(key)) {
      duplicates.add(seen.get(key));
      duplicates.add(index);
    } else {
      seen.set(key, index);
    }
  });

  return duplicates;
}

function highlightDuplicates() {
  const duplicates = findDuplicateIndexes();

  document.querySelectorAll(".user-input").forEach((input) => {
    input.classList.toggle(
      "duplicate",
      duplicates.has(Number(input.dataset.index)),
    );
  });

  return duplicates;
}

/*
|--------------------------------------------------------------------------
| Find rows with typed text that never resolved to a real id/imei
| (i.e. no suggestion was selected from the search results).
|--------------------------------------------------------------------------
*/

function findUnresolvedIndex() {
  return users.findIndex((user) => (user.label || "").trim() && !user.value);
}

function updateSuggestions(index, query) {
  clearTimeout(suggestionTimers[index]);

  suggestionTimers[index] = setTimeout(async () => {
    try {
      const response = await fetch(
        `/api/receivers/search/${currentType}?q=${encodeURIComponent(query)}`,
      );
      const data = await response.json();

      if (!data.success) {
        return;
      }

      suggestionCache[index] = data.results;
      openSuggestionsFor(index);
    } catch (error) {
      console.error("Failed to fetch suggestions:", error);
    }
  }, 250);
}

/*
|--------------------------------------------------------------------------
| Position the shared floating panel (position: fixed) directly above the
| target input, using viewport coordinates so it is never clipped by the
| scrollable/rounded card container - like a comment box mention popup.
|--------------------------------------------------------------------------
*/

function positionSuggestionPanel(input) {
  const rect = input.getBoundingClientRect();

  suggestionPanel.style.left = `${rect.left}px`;
  suggestionPanel.style.width = `${rect.width}px`;
  suggestionPanel.style.bottom = `${window.innerHeight - rect.top + 6}px`;
}

function openSuggestionsFor(index) {
  const input = document.querySelector(`.user-input[data-index="${index}"]`);

  if (!input) {
    return;
  }

  activeSuggestionIndex = index;
  positionSuggestionPanel(input);
  renderSuggestionOptions(index);
  suggestionPanel.classList.add("open");
}

function renderSuggestionOptions(index) {
  const results = suggestionCache[index] || [];

  if (results.length === 0) {
    suggestionPanel.innerHTML = `<div class="user-suggestion-empty">No matches found</div>`;
    return;
  }

  suggestionPanel.innerHTML = results
    .map(
      (item, itemIndex) => `
        <div class="user-suggestion-option" data-item="${itemIndex}">${escapeHtml(item.label)}</div>
    `,
    )
    .join("");

  suggestionPanel
    .querySelectorAll(".user-suggestion-option")
    .forEach((option) => {
      option.addEventListener("click", () => {
        const item = suggestionCache[index]?.[Number(option.dataset.item)];

        if (!item) {
          return;
        }

        users[index] = { value: item.value, label: item.label };

        const input = document.querySelector(
          `.user-input[data-index="${index}"]`,
        );
        if (input) {
          input.value = item.label;
        }

        closeSuggestions();
        highlightDuplicates();
      });
    });
}

function closeSuggestions() {
  suggestionPanel.classList.remove("open");
  activeSuggestionIndex = null;
}

async function loadReceivers() {
  try {
    const response = await fetch("/api/receivers");
    const data = await response.json();

    if (!data.success) {
      return;
    }

    receivers = data.receivers;
    renderReceiverOptions();
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

    currentType = type_of_data;
    mappedHeading.textContent = isUser ? "Users" : "IMEI";

    users = mapped_display || [];

    renderUsers();
  } catch (error) {
    console.error("Failed to load receiver mapping:", error);
  }
}

/*
|--------------------------------------------------------------------------
| Custom animated, scrollable receiver dropdown (replaces native <select>)
|--------------------------------------------------------------------------
*/

function renderReceiverOptions() {
  receiverPanel.innerHTML = receivers
    .map(
      ({ id, receiver_name }) => `
        <div
            class="custom-select-option${String(id) === String(selectedReceiverId) ? " selected" : ""}"
            role="option"
            data-id="${id}"
        >${escapeHtml(receiver_name)}</div>
    `,
    )
    .join("");

  receiverPanel.querySelectorAll(".custom-select-option").forEach((option) => {
    option.addEventListener("click", () => {
      selectReceiver(option.dataset.id, option.textContent);
    });
  });
}

function openReceiverDropdown() {
  receiverDropdown.classList.add("open");
  receiverTrigger.setAttribute("aria-expanded", "true");
}

function closeReceiverDropdown() {
  receiverDropdown.classList.remove("open");
  receiverTrigger.setAttribute("aria-expanded", "false");
}

function selectReceiver(id, name) {
  selectedReceiverId = id || "";
  receiverLabel.textContent = id ? name : "Select receiver";

  renderReceiverOptions();
  closeReceiverDropdown();

  if (!selectedReceiverId) {
    currentType = "user";
    mappedHeading.textContent = "Users";
    users = [];
    renderUsers();
    return;
  }

  loadReceiverMapping(selectedReceiverId);
}

receiverTrigger.addEventListener("click", () => {
  receiverDropdown.classList.contains("open")
    ? closeReceiverDropdown()
    : openReceiverDropdown();
});

document.addEventListener("click", (event) => {
  if (!receiverDropdown.contains(event.target)) {
    closeReceiverDropdown();
  }

  if (
    !event.target.closest(".user-input-wrap") &&
    !event.target.closest("#sharedSuggestionPanel")
  ) {
    closeSuggestions();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeReceiverDropdown();
    closeSuggestions();
  }
});

window.addEventListener("resize", () => {
  if (activeSuggestionIndex !== null) {
    closeSuggestions();
  }
});

userList.addEventListener("scroll", () => {
  if (activeSuggestionIndex !== null) {
    const input = document.querySelector(
      `.user-input[data-index="${activeSuggestionIndex}"]`,
    );
    if (input) {
      positionSuggestionPanel(input);
    }
  }
});

addUserBtn.addEventListener("click", () => {
  users.unshift({ value: null, label: "" });
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
  selectedReceiverId = "";
  receiverLabel.textContent = "Select receiver";
  renderReceiverOptions();
  currentType = "user";
  mappedHeading.textContent = "Users";
  users = [];
  renderUsers();
});

saveBtn.addEventListener("click", async () => {
  if (!selectedReceiverId) {
    alert("Please select a receiver.");
    receiverTrigger.focus();
    return;
  }

  const unresolvedIndex = findUnresolvedIndex();
  if (unresolvedIndex !== -1) {
    const input = document.querySelector(
      `.user-input[data-index="${unresolvedIndex}"]`,
    );
    input?.classList.add("duplicate");
    input?.focus();
    alert(
      `Row ${unresolvedIndex + 1}: please pick a match from the search suggestions before saving.`,
    );
    return;
  }

  if (highlightDuplicates().size > 0) {
    alert(
      "Duplicate values found. Please resolve the highlighted fields before saving.",
    );
    return;
  }

  const validValues = users.map(resolveRawValue).filter(Boolean);

  if (validValues.length === 0) {
    alert("Please add at least one mapped value.");
    return;
  }

  try {
    const response = await fetch(`/api/receivers/${selectedReceiverId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type_of_data: currentType,
        values: validValues,
      }),
    });

    const data = await response.json();

    if (!data.success) {
      alert(data.message || "Failed to save Push Live Data configuration.");
      return;
    }

    alert("Push Live Data configuration saved.");
  } catch (error) {
    console.error("Failed to save receiver mapping:", error);
    alert("Failed to save Push Live Data configuration.");
  }
});

renderUsers();
loadReceivers();
loadCurrentUser();

/*
|--------------------------------------------------------------------------
| Header: current user + logout
|--------------------------------------------------------------------------
*/

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
