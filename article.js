const params = new URLSearchParams(location.search);
const slug = params.get("slug");
const titleEl = document.querySelector("#articleTitle");
const subtitleEl = document.querySelector("#articleSubtitle");
const metaEl = document.querySelector("#articleMeta");
const tagsEl = document.querySelector("#articleTags");
const bodyEl = document.querySelector("#articleBody");

loadArticle();

async function loadArticle() {
  try {
    const manifestResponse = await fetch("content/index.json");
    const items = await manifestResponse.json();
    const item = items.find(entry => entry.slug === slug);
    if (!item) throw new Error("Not found");
    const contentResponse = await fetch(item.path);
    if (!contentResponse.ok) throw new Error("Could not load content");
    const markdown = (await contentResponse.text()).replaceAll("\r\n", "\n");

    document.title = `${item.title} · Ellie's Collection`;
    titleEl.textContent = item.title;
    subtitleEl.textContent = item.subtitle || "";
    metaEl.innerHTML = `<span>${escapeHtml(item.type)}</span><span>·</span><span>${escapeHtml(item.collection)}</span><span>·</span><time>${formatDate(item.date)}</time>`;
    tagsEl.innerHTML = (item.tags || []).map(tag => `<a href="index.html?tag=${encodeURIComponent(tag)}">${escapeHtml(tag)}</a>`).join("");

    const bodyMarkdown = markdown.replace(/^#\s+.*\n+/, "");
    bodyEl.classList.toggle("memoir-piece", item.slug === "i-wish-you-could-have-met-her");
    bodyEl.innerHTML = item.slug === "i-wish-you-could-have-met-her"
      ? renderMemoirMarkdown(bodyMarkdown)
      : renderMarkdown(bodyMarkdown);
  } catch {
    titleEl.textContent = "Piece not found";
    subtitleEl.textContent = "This page could not be loaded.";
    bodyEl.innerHTML = `<p><a href="index.html">Return to the archive.</a></p>`;
  }
}

function renderMemoirMarkdown(markdown) {
  const lines = markdown.split("\n");
  const html = [];
  let verse = [];

  const flushVerse = () => {
    if (!verse.length) return;
    html.push(`<blockquote class="song-stanza">${verse.map(line => `<span>${inline(line)}</span>`).join("")}</blockquote>`);
    verse = [];
  };

  lines.forEach(rawLine => {
    const text = rawLine.trim();
    if (!text) {
      flushVerse();
      return;
    }

    if (/^\*[^*].*\*$/.test(text)) {
      verse.push(text.replace(/^\*/, "").replace(/\*$/, ""));
      return;
    }

    flushVerse();

    if (/^###\s/.test(text)) {
      html.push(`<h3>${inline(text.replace(/^###\s+/, ""))}</h3>`);
      return;
    }
    if (/^##\s/.test(text)) {
      html.push(`<h2>${inline(text.replace(/^##\s+/, ""))}</h2>`);
      return;
    }
    if (/^>\s/.test(text)) {
      html.push(`<blockquote>${inline(text.replace(/^>\s?/, ""))}</blockquote>`);
      return;
    }

    const plain = text.replace(/[*_`]/g, "").trim();
    const wordCount = plain.split(/\s+/).filter(Boolean).length;
    const isClosingLine = /I can see the lights of home\.?$/i.test(plain);
    const isStandalone = wordCount <= 10;
    const classes = [
      isStandalone ? "standalone-line" : "",
      isClosingLine ? "closing-line" : "",
    ].filter(Boolean).join(" ");

    html.push(`<p${classes ? ` class="${classes}"` : ""}>${inline(text)}</p>`);
  });

  flushVerse();
  return html.join("\n");
}

function renderMarkdown(markdown) {
  const blocks = markdown.split(/\n{2,}/);
  return blocks.map(block => {
    const text = block.trim();
    if (!text) return "";
    if (/^###\s/.test(text)) return `<h3>${inline(text.replace(/^###\s+/, ""))}</h3>`;
    if (/^##\s/.test(text)) return `<h2>${inline(text.replace(/^##\s+/, ""))}</h2>`;
    if (/^>\s/.test(text)) return `<blockquote>${inline(text.replace(/^>\s?/gm, "").replaceAll("\n", " "))}</blockquote>`;
    if (/^[-*]\s/m.test(text) && text.split("\n").every(line => /^[-*]\s/.test(line))) {
      return `<ul>${text.split("\n").map(line => `<li>${inline(line.replace(/^[-*]\s+/, ""))}</li>`).join("")}</ul>`;
    }
    return `<p>${inline(text).replaceAll("\n", "<br>")}</p>`;
  }).join("\n");
}

function inline(value) {
  let safe = escapeHtml(value);
  safe = safe.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  safe = safe.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  safe = safe.replace(/\*(.+?)\*/g, "<em>$1</em>");
  safe = safe.replace(/`(.+?)`/g, "<code>$1</code>");
  return safe;
}

function formatDate(value) { return new Intl.DateTimeFormat("en", { month: "long", day: "numeric", year: "numeric" }).format(new Date(`${value}T12:00:00`)); }
function escapeHtml(value) { return String(value).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;"); }
