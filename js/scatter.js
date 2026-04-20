// ── Component 4: Scatter Plot — Bridge Age vs. Condition Rating ───────────────
// x = bridge age (years), y = lowest condition rating (0–9)
// Dot color = G/F/P, dot size = ADT (traffic volume)
// Dashed reference lines at ratings 4 (Poor threshold) and 7 (Good threshold)
function initScatter(App) {
  const M  = { top: 12, right: 24, bottom: 38, left: 38 };
  const VW = 480, VH = 280;
  const W  = VW - M.left - M.right;
  const H  = VH - M.top  - M.bottom;

  const svg = d3.select("#chart-scatter").attr("viewBox", `0 0 ${VW} ${VH}`);
  const g   = svg.append("g").attr("transform", `translate(${M.left},${M.top})`);

  // Sample bridges_2025 for performance (max 4000 points)
  const raw    = App.data.bridges.filter(d => d.age != null && d.lowest_rating != null);
  const sample = raw.length > 4000
    ? d3.shuffle([...raw]).slice(0, 4000)
    : raw;

  const maxAge = d3.max(sample, d => d.age) || 150;
  const maxADT = d3.max(sample, d => d.adt || 0);

  const x      = d3.scaleLinear().domain([0, maxAge + 5]).range([0, W]);
  const y      = d3.scaleLinear().domain([0, 9]).range([H, 0]);
  const rScale = d3.scaleSqrt().domain([0, maxADT]).range([1.5, 7]).clamp(true);

  // Grid
  g.append("g").selectAll("line.grid-line")
    .data(y.ticks(9))
    .join("line").attr("class", "grid-line")
    .attr("x1", 0).attr("x2", W)
    .attr("y1", d => y(d)).attr("y2", d => y(d));

  // Axes
  g.append("g").attr("transform", `translate(0,${H})`)
    .call(d3.axisBottom(x).ticks(8).tickSize(4));
  g.append("g")
    .call(d3.axisLeft(y).ticks(9).tickSize(4));

  // Axis labels
  svg.append("text").attr("class", "axis-lbl")
    .attr("x", M.left + W / 2).attr("y", VH - 2)
    .attr("text-anchor", "middle").text("Bridge Age (years)");
  svg.append("text").attr("class", "axis-lbl")
    .attr("transform", "rotate(-90)")
    .attr("x", -(M.top + H / 2)).attr("y", 10)
    .attr("text-anchor", "middle").text("Lowest Condition Rating");

  // Threshold reference lines
  const thresholds = [
    { val: 4, label: "≤ 4 = Poor",  color: "#f85149" },
    { val: 7, label: "≥ 7 = Good",  color: "#3fb950" },
  ];
  thresholds.forEach(t => {
    g.append("line")
      .attr("x1", 0).attr("x2", W)
      .attr("y1", y(t.val)).attr("y2", y(t.val))
      .attr("stroke", t.color).attr("stroke-dasharray", "4 3")
      .attr("stroke-width", 1).attr("opacity", 0.6);
    g.append("text").attr("class", "axis-lbl")
      .attr("x", W + 2).attr("y", y(t.val)).attr("dy", "0.35em")
      .attr("font-size", "9px").attr("fill", t.color)
      .text(t.val);
  });

  // Dots
  const dots = g.append("g").selectAll("circle")
    .data(sample)
    .join("circle")
    .attr("cx",   d => x(d.age))
    .attr("cy",   d => y(d.lowest_rating))
    .attr("r",    d => rScale(d.adt || 0))
    .attr("fill", d => App.COLORS[d.bridge_condition] || App.COLORS.unknown)
    .attr("opacity", 0.5)
    .on("mousemove", (event, d) => {
      showTip(event,
        `<strong>${d.facility || d.feature || d.id}</strong>
         ${d.county_name} Co.<br>
         Built: ${d.year_built}  (Age: ${d.age} yrs)<br>
         Rating: ${d.lowest_rating} / 9<br>
         ADT: ${(d.adt || 0).toLocaleString()}<br>
         Condition: ${{ G: "Good", F: "Fair", P: "Poor" }[d.bridge_condition] || "N/A"}`
      );
    })
    .on("mouseleave", hideTip);

  // Legend (condition color)
  const legG = svg.append("g").attr("transform", `translate(${M.left + 8},${M.top + 6})`);
  [["G", "Good"], ["F", "Fair"], ["P", "Poor"]].forEach(([k, lbl], i) => {
    const row = legG.append("g").attr("transform", `translate(${i * 52},0)`);
    row.append("circle").attr("r", 5).attr("fill", App.COLORS[k]).attr("opacity", 0.7);
    row.append("text").attr("x", 8).attr("dy", "0.35em").attr("class", "legend-lbl").text(lbl);
  });

  // ── Update: fade non-matching dots on filter change ──────────────────────
  function update(state) {
    dots.transition().duration(200)
      .attr("opacity", d => {
        const condMatch = state.condition === "all" || d.bridge_condition === state.condition;
        const countyMatch = !state.county || d.county_fips === state.county;
        if (!condMatch || !countyMatch) return 0.06;
        return 0.55;
      })
      .attr("r", d => {
        const base = rScale(d.adt || 0);
        return state.county && d.county_fips === state.county ? base + 1.5 : base;
      });
  }

  update(App.state);
  App.dispatch.on("stateChanged.scatter", update);
}
