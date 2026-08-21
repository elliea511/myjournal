const state = { items: [], query: "", type: "All", collection: "All", tag: new URLSearchParams(location.search).get("tag") || "" };
const search = document.querySelector("#archiveSearch");
const typeFilters = document.querySelector("#typeFilters");
const collectionFilters = document.querySelector("#collectionFilters");
const featuredGrid = document.querySelector("#featuredGrid");
const archiveGrid = document.querySelector("#archiveGrid");
const archiveEmpty = document.querySelector("#archiveEmpty");
const resultCount = document.querySelector("#resultCount");
const tagCloud = document.querySelector("#tagCloud");

init();

async function init() {
  try {
    const response = await fetch("content/index.json");
    state.items = await response.json();
    buildFilters();
    render();
  } catch {
    archiveEmpty.hidden = false;
    archiveEmpty.textContent = "The archive could not be loaded.";
  }
}

search.addEventListener("input", () => {
  state.query = search.value.trim().toLowerCase();
  render();
});

function buildFilters() {
  renderFilterGroup(typeFilters, ["All", ...unique(state.items.map(i => i.type))], "type");
  renderFilterGroup(collectionFilters, ["All", ...unique(state.items.map(i => i.collection))], "collection");
  const tags = {};
  state.items.flatMap(i => i.tags || []).forEach(tag => tags[tag] = (tags[tag] || 0) + 1);
  tagCloud.innerHTML = Object.entries(tags).sort((a,b) => b[1]-a[1]).map(([tag,count]) => `<button class="tag-button" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)} <span>${count}</span></button>`).join("");
  tagCloud.querySelectorAll("button").forEach(button => button.addEventListener("click", () => {
    state.tag = state.tag === button.dataset.tag ? "" : button.dataset.tag;
    const url = new URL(location.href);
    state.tag ? url.searchParams.set("tag", state.tag) : url.searchParams.delete("tag");
    history.replaceState({}, "", url);
    render();
  }));
}

function renderFilterGroup(container, values, key) {
  container.innerHTML = values.map(value => `<button class="filter-button${value === "All" ? " active" : ""}" data-value="${escapeHtml(value)}">${escapeHtml(value)}</button>`).join("");
  container.querySelectorAll("button").forEach(button => button.addEventListener("click", () => {
    state[key] = button.dataset.value;
    container.querySelectorAll("button").forEach(b => b.classList.toggle("active", b === button));
    render();
  }));
}

function render() {
  const visible = state.items.filter(item => {
    const haystack = `${item.title} ${item.subtitle || ""} ${item.excerpt || ""} ${item.type} ${item.collection} ${(item.tags || []).join(" ")}`.toLowerCase();
    return (!state.query || haystack.includes(state.query)) &&
      (state.type === "All" || item.type === state.type) &&
      (state.collection === "All" || item.collection === state.collection) &&
      (!state.tag || (item.tags || []).includes(state.tag));
  }).sort((a,b) => b.date.localeCompare(a.date));

  const featured = state.items.filter(item => item.featured).slice(0, 3);
  featuredGrid.innerHTML = featured.map(item => card(item, true)).join("");
  archiveGrid.innerHTML = visible.map(item => card(item, false)).join("");
  archiveEmpty.hidden = visible.length > 0;
  resultCount.textContent = `${visible.length} ${visible.length === 1 ? "piece" : "pieces"}`;
  tagCloud.querySelectorAll("button").forEach(button => button.classList.toggle("active", button.dataset.tag === state.tag));
}

function card(item, featured) {
  const tags = (item.tags || []).slice(0, 4).map(tag => `<span>${escapeHtml(tag)}</span>`).join("");
  return `<article class="piece-card${featured ? " featured-card" : ""}">
    <a class="card-link" href="article.html?slug=${encodeURIComponent(item.slug)}">
      <div class="piece-meta"><span>${escapeHtml(item.type)}</span><span>·</span><span>${escapeHtml(item.collection)}</span><span>·</span><time>${formatDate(item.date)}</time></div>
      <h3>${escapeHtml(item.title)}</h3>
      ${item.subtitle ? `<p class="piece-subtitle">${escapeHtml(item.subtitle)}</p>` : ""}
      <p class="piece-excerpt">${escapeHtml(item.excerpt || "")}</p>
      <div class="tag-row">${tags}</div>
      <span class="read-more">Read piece →</span>
    </a>
  </article>`;
}

function unique(values) { return [...new Set(values.filter(Boolean))].sort(); }
function formatDate(value) { return new Intl.DateTimeFormat("en", { month: "long", day: "numeric", year: "numeric" }).format(new Date(`${value}T12:00:00`)); }
function escapeHtml(value) { return String(value).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;"); }
