const storageKey = "myjournal.entries";
const mawmawSeedKey = "myjournal.seeded.mawmaw-v1";

const todayLabel = document.querySelector("#todayLabel");
const entryList = document.querySelector("#entryList");
const searchInput = document.querySelector("#searchInput");
const newEntryButton = document.querySelector("#newEntryButton");
const saveButton = document.querySelector("#saveButton");
const deleteButton = document.querySelector("#deleteButton");
const saveStatus = document.querySelector("#saveStatus");
const titleInput = document.querySelector("#titleInput");
const dateInput = document.querySelector("#dateInput");
const moodInput = document.querySelector("#moodInput");
const promptInput = document.querySelector("#promptInput");
const bodyInput = document.querySelector("#bodyInput");
const promptButtons = document.querySelectorAll(".prompt-button");

let entries = readEntries();
let activeId = entries[0]?.id || createEntry().id;

todayLabel.textContent = new Intl.DateTimeFormat("en", {
  weekday: "long",
  month: "long",
  day: "numeric",
}).format(new Date());

render();
loadActiveEntry();
seedMawmawEntry();

newEntryButton.addEventListener("click", () => {
  activeId = createEntry().id;
  persist();
  render();
  loadActiveEntry();
  titleInput.focus();
});

saveButton.addEventListener("click", saveCurrentEntry);
deleteButton.addEventListener("click", deleteCurrentEntry);
searchInput.addEventListener("input", renderEntryList);

[titleInput, dateInput, moodInput, promptInput, bodyInput].forEach((field) => {
  field.addEventListener("input", () => {
    saveStatus.textContent = "Unsaved";
  });
});

promptButtons.forEach((button) => {
  button.addEventListener("click", () => {
    promptButtons.forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    promptInput.value = button.dataset.prompt;
    saveStatus.textContent = "Unsaved";
  });
});

async function seedMawmawEntry() {
  if (localStorage.getItem(mawmawSeedKey)) return;

  try {
    const response = await fetch("entries/i-wish-you-could-have-met-her.md");
    if (!response.ok) return;

    const markdown = (await response.text()).replaceAll("\r\n", "\n");
    const lines = markdown.split("\n");
    const title = (lines.shift() || "I Wish You Could Have Met Her")
      .replace(/^#\s+/, "")
      .trim();

    while (lines[0] === "") lines.shift();
    const body = lines.join("\n").trimEnd();

    const alreadySaved = entries.some(
      (entry) =>
        entry.id === "mawmaw-i-wish-you-could-have-met-her" ||
        entry.title === title,
    );

    if (!alreadySaved) {
      const mawmawEntry = {
        id: "mawmaw-i-wish-you-could-have-met-her",
        title,
        date: "2026-08-21",
        mood: "tender",
        prompt: "What do I want to remember about today?",
        body,
        updatedAt: Date.parse("2026-08-21T06:01:32Z"),
      };

      if (
        entries.length === 1 &&
        !entries[0].title &&
        !entries[0].body
      ) {
        entries[0] = mawmawEntry;
      } else {
        entries.unshift(mawmawEntry);
      }

      activeId = mawmawEntry.id;
      persist();
      render();
      loadActiveEntry();
    }

    localStorage.setItem(mawmawSeedKey, "1");
  } catch {
    // Leave the seed unset so the site can try again on the next load.
  }
}

function readEntries() {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) || [];
  } catch {
    return [];
  }
}

function createEntry() {
  const entry = {
    id: crypto.randomUUID(),
    title: "",
    date: new Date().toISOString().slice(0, 10),
    mood: "calm",
    prompt: "What do I want to remember about today?",
    body: "",
    updatedAt: Date.now(),
  };

  entries.unshift(entry);
  return entry;
}

function persist() {
  entries.sort((a, b) => b.updatedAt - a.updatedAt);
  localStorage.setItem(storageKey, JSON.stringify(entries));
}

function activeEntry() {
  return entries.find((entry) => entry.id === activeId);
}

function loadActiveEntry() {
  const entry = activeEntry();
  if (!entry) return;

  titleInput.value = entry.title;
  dateInput.value = entry.date;
  moodInput.value = entry.mood;
  promptInput.value = entry.prompt;
  bodyInput.value = entry.body;
  saveStatus.textContent = "Ready";
  setActivePrompt(entry.prompt);
}

function saveCurrentEntry() {
  const entry = activeEntry();
  if (!entry) return;

  entry.title = titleInput.value.trim();
  entry.date = dateInput.value || new Date().toISOString().slice(0, 10);
  entry.mood = moodInput.value;
  entry.prompt = promptInput.value.trim();
  entry.body = bodyInput.value.trim();
  entry.updatedAt = Date.now();

  persist();
  render();
  saveStatus.textContent = "Saved";
}

function deleteCurrentEntry() {
  if (entries.length === 1 && !activeEntry()?.body && !activeEntry()?.title) {
    return;
  }

  entries = entries.filter((entry) => entry.id !== activeId);
  if (!entries.length) {
    activeId = createEntry().id;
  } else {
    activeId = entries[0].id;
  }

  persist();
  render();
  loadActiveEntry();
}

function render() {
  renderEntryList();
}

function renderEntryList() {
  const query = searchInput.value.trim().toLowerCase();
  const visibleEntries = entries.filter((entry) => {
    const text = `${entry.title} ${entry.body} ${entry.prompt} ${entry.mood}`.toLowerCase();
    return text.includes(query);
  });

  if (!visibleEntries.length) {
    entryList.innerHTML = `<p class="empty-state">No matching entries yet.</p>`;
    return;
  }

  entryList.innerHTML = "";
  visibleEntries.forEach((entry) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `entry-item${entry.id === activeId ? " active" : ""}`;
    button.innerHTML = `
      <strong>${escapeHtml(entry.title || "Untitled entry")}</strong>
      <span>${formatDate(entry.date)} · ${capitalize(entry.mood)}</span>
    `;
    button.addEventListener("click", () => {
      activeId = entry.id;
      renderEntryList();
      loadActiveEntry();
    });
    entryList.append(button);
  });
}

function setActivePrompt(prompt) {
  promptButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.prompt === prompt);
  });
}

function formatDate(value) {
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
