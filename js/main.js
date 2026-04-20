// ── Shared application state ──────────────────────────────────────────────────
const App = {
  state: {
    year:       2025,
    county:     null,   // county_fips string ("26001") or null = all
    countyName: null,
    condition:  "all",  // "all" | "G" | "F" | "P"
  },
  data: {
    summary:  null,  // county_summary.json
    bridges:  null,  // bridges_2025.json  (used by scatter + donut)
    topology: null,  // us-atlas counties topojson
  },
  COLORS: { G: "#3fb950", F: "#d29922", P: "#f85149", unknown: "#484f58" },
  dispatch: d3.dispatch("stateChanged"),
};

// ── Data loading ──────────────────────────────────────────────────────────────
async function loadData() {
  const [summary, bridges, topo] = await Promise.all([
    d3.json("data/county_summary.json"),
    d3.json("data/bridges_2025.json"),
    d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json"),
  ]);
  App.data.summary  = summary;
  App.data.bridges  = bridges;
  App.data.topology = topo;
}

// ── Boot ──────────────────────────────────────────────────────────────────────
(async function init() {
  try {
    await loadData();
  } catch (err) {
    document.getElementById("loading-msg").textContent =
      "Error loading data. Run: python -m http.server 8080";
    console.error(err);
    return;
  }

  document.getElementById("loading-msg").remove();
  document.getElementById("dashboard").style.visibility = "visible";

  // Init all charts
  initMap(App);
  initTrends(App);
  initDonut(App);
  initScatter(App);
  initBarChart(App);
  initHeatmap(App);

  // ── Controls ────────────────────────────────────────────────────────────────
  const slider   = document.getElementById("year-slider");
  const yearVal  = document.getElementById("year-val");

  slider.addEventListener("input", () => {
    App.state.year = +slider.value;
    yearVal.textContent = slider.value;
    App.dispatch.call("stateChanged", null, App.state);
  });

  document.getElementById("cond-filter").addEventListener("click", e => {
    const btn = e.target.closest(".cond-btn");
    if (!btn) return;
    document.querySelectorAll(".cond-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    App.state.condition = btn.dataset.cond;
    App.dispatch.call("stateChanged", null, App.state);
  });

  document.getElementById("clear-county").addEventListener("click", () => {
    App.state.county     = null;
    App.state.countyName = null;
    document.getElementById("county-ctrl").style.visibility = "hidden";
    App.dispatch.call("stateChanged", null, App.state);
  });
}());

// ── Shared tooltip helper ─────────────────────────────────────────────────────
const tooltip = d3.select("#shared-tooltip");

function showTip(event, html) {
  tooltip.classed("show", true).html(html);
  moveTip(event);
}
function moveTip(event) {
  const x = event.clientX, y = event.clientY;
  const tw = 230, th = 100;
  const left = x + 14 + tw > window.innerWidth  ? x - tw - 10 : x + 14;
  const top  = y + 14 + th > window.innerHeight ? y - th - 10 : y + 14;
  tooltip.style("left", left + "px").style("top", top + "px");
}
function hideTip() { tooltip.classed("show", false); }
