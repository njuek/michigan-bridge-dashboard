// ── Component 3: Donut / Ring Chart ──────────────────────────────────────────
// Summarizes Good / Fair / Poor bridge counts for the selected year + county.
// Hover a slice to see the exact percentage.
function initDonut(App) {
  const VW = 380, VH = 280;
  const svg = d3.select("#chart-donut").attr("viewBox", `0 0 ${VW} ${VH}`);

  const cx = VW * 0.42, cy = VH / 2;
  const outerR = Math.min(cx, cy) - 10;
  const innerR = outerR * 0.54;

  const g = svg.append("g").attr("transform", `translate(${cx},${cy})`);

  const arc      = d3.arc().innerRadius(innerR).outerRadius(outerR);
  const arcHover = d3.arc().innerRadius(innerR).outerRadius(outerR + 7);
  const pie      = d3.pie().sort(null).value(d => d.count).padAngle(0.025);

  // Center labels
  const centerCount = g.append("text")
    .attr("text-anchor", "middle").attr("dy", "-0.1em")
    .attr("font-size", "24px").attr("font-weight", "700").attr("fill", "#c9d1d9");
  const centerLabel = g.append("text")
    .attr("text-anchor", "middle").attr("dy", "1.3em")
    .attr("font-size", "11px").attr("fill", "#8b949e");

  // Legend (right of donut)
  const legG = svg.append("g").attr("transform", `translate(${cx + outerR + 18}, ${cy - 40})`);

  // ── Helper: aggregate counts from county_summary ────────────────────────────
  function getCounts(state) {
    let rows = App.data.summary.filter(d => d.year === state.year);
    if (state.county) rows = rows.filter(d => d.county_fips === state.county);
    const totals = { G: 0, F: 0, P: 0 };
    rows.forEach(d => { totals.G += d.good; totals.F += d.fair; totals.P += d.poor; });
    return [
      { key: "G", label: "Good", count: totals.G },
      { key: "F", label: "Fair", count: totals.F },
      { key: "P", label: "Poor", count: totals.P },
    ].filter(d => {
      if (state.condition === "all") return true;
      return d.key === state.condition;
    });
  }

  function update(state) {
    const data  = getCounts(state);
    const total = d3.sum(data, d => d.count);

    centerCount.text(total.toLocaleString());
    centerLabel.text(state.county ? (state.countyName + " Co.") : "Michigan");

    const pieData = pie(data);

    const slices = g.selectAll("path.slice")
      .data(pieData, d => d.data.key)
      .join(
        enter => enter.append("path").attr("class", "slice")
          .attr("cursor", "pointer")
      )
      .attr("fill",   d => App.COLORS[d.data.key])
      .attr("stroke", "#161b22")
      .attr("stroke-width", 1.5);

    slices
      .transition().duration(400)
      .attrTween("d", function(d) {
        const prev = this._current || d;
        this._current = d;
        const interp = d3.interpolate(prev, d);
        return t => arc(interp(t));
      });

    slices
      .on("mouseover", function(event, d) {
        d3.select(this).attr("d", arcHover);
        const pct = total > 0 ? ((d.data.count / total) * 100).toFixed(1) : "0.0";
        showTip(event,
          `<strong>${d.data.label} Bridges</strong>
           Count: ${d.data.count.toLocaleString()}<br>
           Share: ${pct}%`
        );
      })
      .on("mousemove", moveTip)
      .on("mouseleave", function(event, d) {
        d3.select(this).attr("d", arc);
        hideTip();
      });

    // Legend
    legG.selectAll("*").remove();
    data.forEach((d, i) => {
      const pct = total > 0 ? ((d.count / total) * 100).toFixed(1) : "0.0";
      const row = legG.append("g").attr("transform", `translate(0,${i * 30})`);
      row.append("rect").attr("width", 11).attr("height", 11).attr("rx", 2)
        .attr("fill", App.COLORS[d.key]);
      row.append("text").attr("x", 16).attr("y", 9).attr("class", "legend-lbl")
        .attr("font-size", "10px")
        .text(`${d.label}`);
      row.append("text").attr("x", 16).attr("y", 20).attr("class", "legend-lbl")
        .attr("font-size", "10px").attr("fill", "#c9d1d9")
        .text(`${d.count.toLocaleString()} (${pct}%)`);
    });
  }

  update(App.state);
  App.dispatch.on("stateChanged.donut", update);
}
