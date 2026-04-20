// ── Component 5: Horizontal Stacked Bar Chart ─────────────────────────────────
// Shows top 20 counties ranked by % poor bridges for the selected year.
// Stacked by Good / Fair / Poor counts. Responds to year slider.
function initBarChart(App) {
  const M  = { top: 6, right: 48, bottom: 28, left: 84 };
  const VW = 480, VH = 280;
  const W  = VW - M.left - M.right;
  const H  = VH - M.top  - M.bottom;

  const svg = d3.select("#chart-bar").attr("viewBox", `0 0 ${VW} ${VH}`);
  const g   = svg.append("g").attr("transform", `translate(${M.left},${M.top})`);

  const STACK_KEYS   = ["poor", "fair", "good"];
  const STACK_COLORS = { poor: App.COLORS.P, fair: App.COLORS.F, good: App.COLORS.G };

  const x = d3.scaleLinear().range([0, W]);
  const y = d3.scaleBand().padding(0.22);

  const xAxisG = g.append("g").attr("transform", `translate(0,${H})`);
  const yAxisG = g.append("g");

  const barsG   = g.append("g");
  const labelsG = g.append("g");

  // Legend
  const legG = svg.append("g")
    .attr("transform", `translate(${M.left}, ${VH - 14})`);
  ["good", "fair", "poor"].forEach((k, i) => {
    const row = legG.append("g").attr("transform", `translate(${i * 70},0)`);
    row.append("rect").attr("width", 10).attr("height", 10).attr("rx", 2)
      .attr("fill", STACK_COLORS[k]);
    row.append("text").attr("x", 14).attr("y", 9).attr("class", "legend-lbl")
      .text({ good: "Good", fair: "Fair", poor: "Poor" }[k]);
  });

  // ── Helper: top 20 counties sorted by pct_poor ────────────────────────────
  function getBarData(state) {
    return App.data.summary
      .filter(d => d.year === state.year)
      .sort((a, b) => b.pct_poor - a.pct_poor)
      .slice(0, 20);
  }

  function update(state) {
    const data    = getBarData(state);
    const maxTot  = d3.max(data, d => d.total);

    x.domain([0, maxTot]);
    y.domain(data.map(d => d.county_name)).range([0, H]);

    xAxisG.call(d3.axisBottom(x).ticks(4).tickFormat(d3.format("~s")).tickSize(3));
    yAxisG.call(d3.axisLeft(y).tickSize(0))
      .call(ax => ax.select(".domain").remove())
      .selectAll("text")
      .attr("font-size", "9.5px")
      .attr("fill", d => {
        const row = data.find(r => r.county_name === d);
        return state.county && row?.county_fips === state.county ? "#58a6ff" : "#8b949e";
      });

    // Stack the data
    const stacked = d3.stack().keys(STACK_KEYS)(data);

    barsG.selectAll("g.bar-layer")
      .data(stacked, d => d.key)
      .join(
        enter => enter.append("g").attr("class", "bar-layer")
          .attr("fill", d => STACK_COLORS[d.key]),
        update => update.attr("fill", d => STACK_COLORS[d.key])
      )
      .selectAll("rect")
      .data(d => d, d => d.data.county_name)
      .join("rect")
      .transition().duration(300)
      .attr("y",      d => y(d.data.county_name))
      .attr("x",      d => x(d[0]))
      .attr("width",  d => Math.max(0, x(d[1]) - x(d[0])))
      .attr("height", y.bandwidth())
      .attr("opacity", d =>
        state.county && d.data.county_fips !== state.county ? 0.25 : 1
      );

    // % Poor label at end of each bar
    labelsG.selectAll("text.pct-lbl")
      .data(data, d => d.county_name)
      .join("text")
      .attr("class", "pct-lbl axis-lbl")
      .attr("font-size", "9px")
      .attr("y", d => y(d.county_name) + y.bandwidth() / 2)
      .attr("dy", "0.35em")
      .transition().duration(300)
      .attr("x", d => x(d.total) + 3)
      .text(d => d.pct_poor + "%");
  }

  update(App.state);
  App.dispatch.on("stateChanged.bar", update);
}
