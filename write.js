const draftKey = "mycollection.capture-draft";
const fields = {
  title: document.querySelector("#pieceTitle"),
  type: document.querySelector("#pieceType"),
  collection: document.querySelector("#pieceCollection"),
  tags: document.querySelector("#pieceTags"),
  subtitle: document.querySelector("#pieceSubtitle"),
  body: document.querySelector("#pieceBody"),
};
const statusEl = document.querySelector("#captureStatus");
const previewPanel = document.querySelector("#previewPanel");

restoreDraft();

document.querySelector("#saveDraftButton").addEventListener("click", saveDraft);
document.querySelector("#previewButton").addEventListener("click", previewArticle);
document.querySelector("#downloadButton").addEventListener("click", downloadMarkdown);
Object.values(fields).forEach(field => field.addEventListener("input", () => statusEl.textContent = "Unsaved changes."));

function getPiece() {
  return {
    title: fields.title.value.trim(),
    type: fields.type.value,
    collection: fields.collection.value.trim(),
    tags: fields.tags.value.split(",").map(tag => tag.trim()).filter(Boolean),
    subtitle: fields.subtitle.value.trim(),
    body: fields.body.value.trim(),
    date: new Date().toISOString().slice(0, 10),
  };
}

function saveDraft() {
  localStorage.setItem(draftKey, JSON.stringify(getPiece()));
  statusEl.textContent = "Draft saved on this device.";
}

function restoreDraft() {
  try {
    const piece = JSON.parse(localStorage.getItem(draftKey));
    if (!piece) return;
    fields.title.value = piece.title || "";
    fields.type.value = piece.type || "Thought";
    fields.collection.value = piece.collection || "";
    fields.tags.value = (piece.tags || []).join(", ");
    fields.subtitle.value = piece.subtitle || "";
    fields.body.value = piece.body || "";
  } catch {}
}

function previewArticle() {
  const piece = getPiece();
  document.querySelector("#previewTitle").textContent = piece.title || "Untitled piece";
  document.querySelector("#previewSubtitle").textContent = piece.subtitle;
  document.querySelector("#previewMeta").innerHTML = `<span>${escapeHtml(piece.type)}</span><span>·</span><span>${escapeHtml(piece.collection || "Unsorted")}</span><span>·</span><time>${formatDate(piece.date)}</time>`;
  document.querySelector("#previewTags").innerHTML = piece.tags.map(tag => `<span>${escapeHtml(tag)}</span>`).join("");
  document.querySelector("#previewBody").innerHTML = renderMarkdown(piece.body);
  previewPanel.hidden = false;
  previewPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function downloadMarkdown() {
  const piece = getPiece();
  const title = piece.title || "Untitled piece";
  const markdown = `# ${title}\n\n${piece.body}\n`;
  const blob = new Blob([markdown], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slugify(title)}.md`;
  link.click();
  URL.revokeObjectURL(url);
  statusEl.textContent = "Markdown downloaded. It can be published into the archive later.";
}

function renderMarkdown(markdown) {
  return markdown.split(/\n{2,}/).map(block => {
    const text = block.trim();
    if (!text) return "";
    if (/^###\s/.test(text)) return `<h3>${inline(text.replace(/^###\s+/, ""))}</h3>`;
    if (/^##\s/.test(text)) return `<h2>${inline(text.replace(/^##\s+/, ""))}</h2>`;
    if (/^>\s/.test(text)) return `<blockquote>${inline(text.replace(/^>\s?/gm, "").replaceAll("\n", " "))}</blockquote>`;
    return `<p>${inline(text).replaceAll("\n", "<br>")}</p>`;
  }).join("");
}

function inline(value) {
  let safe = escapeHtml(value);
  safe = safe.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  safe = safe.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  safe = safe.replace(/\*(.+?)\*/g, "<em>$1</em>");
  return safe;
}

function slugify(value) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "untitled-piece"; }
function formatDate(value) { return new Intl.DateTimeFormat("en", { month: "long", day: "numeric", year: "numeric" }).format(new Date(`${value}T12:00:00`)); }
function escapeHtml(value) { return String(value).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;"); }
