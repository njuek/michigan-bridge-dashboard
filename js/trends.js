// ── Component 2: Multi-line Condition Trend Chart ────────────────────────────
// Shows % Good / Fair / Poor bridges for each year 2021–2025.
// Responds to county filter (click on map) to show county-level trends.
function initTrends(App) {
  const M  = { top: 14, right: 72, bottom: 32, left: 38 };
  const VW = 480, VH = 280;
  const W  = VW - M.left - M.right;
  const H  = VH - M.top  - M.bottom;

  const svg = d3.select("#chart-trends").attr("viewBox", `0 0 ${VW} ${VH}`);
  const g   = svg.append("g").attr("transform", `translate(${M.left},${M.top})`);

  const YEARS = [2021, 2022, 2023, 2024, 2025];
  const CONDS = [
    { key: "G", label: "Good", prop: "good" },
    { key: "F", label: "Fair", prop: "fair" },
    { key: "P", label: "Poor", prop: "poor" },
  ];

  const x = d3.scaleLinear().domain([2021, 2025]).range([0, W]);
  const y = d3.scaleLinear().domain([0, 100]).range([H, 0]);

  // Grid
  g.append("g").selectAll("line.grid-line")
    .data(y.ticks(5))
    .join("line")
    .attr("class", "grid-line")
    .attr("x1", 0).attr("x2", W)
    .attr("y1", d => y(d)).attr("y2", d => y(d));

  // Axes
  g.append("g").attr("transform", `translate(0,${H})`)
    .call(d3.axisBottom(x).tickFormat(d3.format("d")).ticks(5).tickSize(4));
  g.append("g")
    .call(d3.axisLeft(y).tickFormat(d => d + "%").ticks(5).tickSize(4));

  // Axis labels
  svg.append("text").attr("class", "axis-lbl")
    .attr("x", M.left + W / 2).attr("y", VH - 2)
    .attr("text-anchor", "middle").text("Year");
  svg.append("text").attr("class", "axis-lbl")
    .attr("transform", `rotate(-90)`)
    .attr("x", -(M.top + H / 2)).attr("y", 10)
    .attr("text-anchor", "middle").text("% of Bridges");

  // Line generator
  const line = d3.line().x(d => x(d.year)).y(d => y(d.pct))
    .curve(d3.curveMonotoneX);

  const linesG = g.append("g");
  const dotsG  = g.append("g");

  // Legend (right side)
  const legG = svg.append("g").attr("transform", `translate(${M.left + W + 8},${M.top + 10})`);
  CONDS.forEach((c, i) => {
    const row = legG.append("g").attr("transform", `translate(0,${i * 18})`);
    row.append("line").attr("x2", 14).attr("stroke", App.COLORS[c.key]).attr("stroke-width", 2);
    row.append("circle").attr("cx", 7).attr("cy", 0).attr("r", 3).attr("fill", App.COLORS[c.key]);
    row.append("text").attr("x", 18).attr("dy", "0.35em").attr("class", "legend-lbl").text(c.label);
  });

  // ── Compute series data from county_summary.json ────────────────────────────
  function series(state) {
    return CONDS.map(c => ({
      key: c.key,
      values: YEARS.map(yr => {
        let rows = App.data.summary.filter(d => d.year === yr);
        if (state.county) rows = rows.filter(d => d.county_fips === state.county);
        const total = d3.sum(rows, d => d.total);
        const count = d3.sum(rows, d => d[c.prop]);
        return { year: yr, pct: total > 0 ? (count / total * 100) : 0 };
      }),
    }));
  }

  function update(state) {
    const data = series(state);

    linesG.selectAll("path.trend")
      .data(data, d => d.key)
      .join(
        enter => enter.append("path").attr("class", "trend")
          .attr("fill", "none")
          .attr("stroke-linejoin", "round")
          .attr("stroke-linecap", "round"),
        update => update
      )
      .attr("stroke", d => App.COLORS[d.key])
      .attr("stroke-width", d =>
        state.condition === "all" || state.condition === d.key ? 2 : 0.8
      )
      .attr("opacity", d =>
        state.condition === "all" || state.condition === d.key ? 1 : 0.25
      )
      .attr("d", d => line(d.values));

    // Dots
    dotsG.selectAll("g.dot-group")
      .data(data, d => d.key)
      .join("g").attr("class", "dot-group")
      .each(function(series) {
        d3.select(this).selectAll("circle")
          .data(series.values)
          .join("circle")
          .attr("cx", d => x(d.year))
          .attr("cy", d => y(d.pct))
          .attr("r", 3.5)
          .attr("fill", App.COLORS[series.key])
          .attr("opacity", state.condition === "all" || state.condition === series.key ? 1 : 0.25)
          .on("mousemove", (event, d) => {
            showTip(event,
              `<strong>${{ G: "Good", F: "Fair", P: "Poor" }[series.key]} — ${d.year}</strong>
               ${d.pct.toFixed(1)}% of ${state.county ? state.countyName + " Co." : "Michigan"} bridges`
            );
          })
          .on("mouseleave", hideTip);
      });
  }

  update(App.state);
  App.dispatch.on("stateChanged.trends", update);
}
