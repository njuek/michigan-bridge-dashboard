// ── Component 6: County × Year Condition Heatmap ─────────────────────────────
// Rows = top 20 counties by total bridge count; Columns = years 2021–2025.
// Cell color = average lowest condition rating (4 = red / poor, 8 = green / good).
// Highlights selected county; hover shows exact stats.
function initHeatmap(App) {
  const M  = { top: 10, right: 20, bottom: 34, left: 96 };
  const VW = 480, VH = 280;
  const W  = VW - M.left - M.right;
  const H  = VH - M.top  - M.bottom;

  const svg = d3.select("#chart-heatmap").attr("viewBox", `0 0 ${VW} ${VH}`);
  const g   = svg.append("g").attr("transform", `translate(${M.left},${M.top})`);

  const YEARS = [2021, 2022, 2023, 2024, 2025];

  // Top 20 counties by 2025 total bridge count (stable ordering)
  const top20 = App.data.summary
    .filter(d => d.year === 2025)
    .sort((a, b) => b.total - a.total)
    .slice(0, 20)
    .map(d => d.county_name);

  const heatRows = App.data.summary.filter(d => top20.includes(d.county_name));

  const x = d3.scaleBand().domain(YEARS).range([0, W]).padding(0.06);
  const y = d3.scaleBand().domain(top20).range([0, H]).padding(0.06);

  // Color: avg_lowest_rating range 4 (red/poor) → 8 (green/good)
  const colorScale = d3.scaleSequential(d3.interpolateRdYlGn).domain([4, 8]).clamp(true);

  // Axes
  g.append("g").attr("transform", `translate(0,${H})`)
    .call(d3.axisBottom(x).tickFormat(d3.format("d")).tickSize(3));
  g.append("g")
    .call(d3.axisLeft(y).tickSize(0))
    .call(ax => ax.select(".domain").remove())
    .selectAll("text").attr("font-size", "9px");

  // Cells
  const cells = g.selectAll("rect.hm-cell")
    .data(heatRows, d => `${d.county_name}-${d.year}`)
    .join("rect")
    .attr("class", "hm-cell")
    .attr("x",      d => x(d.year))
    .attr("y",      d => y(d.county_name))
    .attr("width",  x.bandwidth())
    .attr("height", y.bandwidth())
    .attr("rx", 2)
    .attr("fill",   d => d.avg_lowest_rating != null ? colorScale(d.avg_lowest_rating) : "#21262d")
    .attr("stroke", "#161b22")
    .attr("stroke-width", 0.8)
    .on("mousemove", (event, d) => {
      showTip(event,
        `<strong>${d.county_name} — ${d.year}</strong>
         Avg Rating: ${d.avg_lowest_rating ?? "—"}<br>
         Poor: ${d.poor} &nbsp;(${d.pct_poor}%)<br>
         Good: ${d.good} &nbsp;(${d.pct_good}%)<br>
         Total: ${d.total}`
      );
    })
    .on("mouseleave", hideTip);

  // Gradient legend
  const defs   = svg.append("defs");
  const gradId = "hm-grad";
  const grad   = defs.append("linearGradient").attr("id", gradId);
  [0, .25, .5, .75, 1].forEach(t => {
    grad.append("stop").attr("offset", `${t * 100}%`)
      .attr("stop-color", colorScale(4 + t * 4));
  });

  const lx = M.left + W - 130, ly = VH - 12;
  const lG = svg.append("g").attr("transform", `translate(${lx},${ly})`);
  lG.append("rect").attr("width", 130).attr("height", 7).attr("rx", 2)
    .attr("fill", `url(#${gradId})`);
  lG.append("text").attr("class", "axis-lbl").attr("y", 18).attr("font-size", "9px").text("4 (Poor)");
  lG.append("text").attr("class", "axis-lbl").attr("x", 130).attr("y", 18)
    .attr("text-anchor", "end").attr("font-size", "9px").text("8 (Good)");

  // ── Update: highlight selected county ───────────────────────────────────────
  function update(state) {
    cells
      .attr("stroke", d =>
        state.county && d.county_fips === state.county ? "#58a6ff" : "#161b22"
      )
      .attr("stroke-width", d =>
        state.county && d.county_fips === state.county ? 2 : 0.8
      )
      .attr("opacity", d =>
        state.county && d.county_name !== state.countyName ? 0.35 : 1
      );

    // Highlight selected county label
    g.selectAll(".tick text")
      .attr("fill", d =>
        state.county && state.countyName === d ? "#58a6ff" : "#8b949e"
      );
  }

  update(App.state);
  App.dispatch.on("stateChanged.heatmap", update);
}
