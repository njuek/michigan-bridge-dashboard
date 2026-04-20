// ── Component 1: County Choropleth Map ───────────────────────────────────────
// Shows pct_poor bridges per county for the selected year.
// Click a county to filter all other charts to that county.
function initMap(App) {
  const VW = 480, VH = 420;
  const svg = d3.select("#chart-map")
    .attr("viewBox", `0 0 ${VW} ${VH}`);

  // ── Build Michigan features from US Atlas topojson ──────────────────────────
  const allCounties = topojson.feature(
    App.data.topology,
    App.data.topology.objects.counties
  );
  const miFeatures = allCounties.features.filter(d => {
    const fips = String(d.id).padStart(5, "0");
    return fips.startsWith("26");
  });
  const miCollection = { type: "FeatureCollection", features: miFeatures };

  const projection = d3.geoMercator().fitExtent([[20, 10], [VW - 10, VH - 30]], miCollection);
  const pathGen    = d3.geoPath().projection(projection);

  // ── Summary lookup: fips -> year -> row ────────────────────────────────────
  const byFipsYear = new Map();
  App.data.summary.forEach(d => {
    if (!byFipsYear.has(d.county_fips)) byFipsYear.set(d.county_fips, new Map());
    byFipsYear.get(d.county_fips).set(d.year, d);
  });

  // ── Color scale: 0 % poor (green) → 30 %+ poor (red) ──────────────────────
  const colorScale = d3.scaleSequential(t => d3.interpolateRdYlGn(1 - t))
    .domain([0, 30]).clamp(true);

  // ── Draw county paths ───────────────────────────────────────────────────────
  const paths = svg.append("g")
    .selectAll("path")
    .data(miFeatures)
    .join("path")
    .attr("d", pathGen)
    .attr("stroke", "#21262d")
    .attr("stroke-width", 0.6)
    .attr("cursor", "pointer")
    .on("click", (_event, d) => {
      const fips = String(d.id).padStart(5, "0");
      const row  = byFipsYear.get(fips)?.get(App.state.year);
      if (!row) return;
      App.state.county     = fips;
      App.state.countyName = row.county_name;
      document.getElementById("county-val").textContent  = row.county_name;
      document.getElementById("county-ctrl").style.visibility = "visible";
      App.dispatch.call("stateChanged", null, App.state);
    })
    .on("mousemove", (event, d) => {
      const fips = String(d.id).padStart(5, "0");
      const row  = byFipsYear.get(fips)?.get(App.state.year);
      if (!row) return;
      showTip(event,
        `<strong>${row.county_name} County</strong>
         Total: ${row.total.toLocaleString()} bridges<br>
         Good:  ${row.good} &nbsp;(${row.pct_good}%)<br>
         Fair:  ${row.fair}<br>
         Poor:  ${row.poor} &nbsp;(${row.pct_poor}%)<br>
         Avg Rating: ${row.avg_lowest_rating ?? "—"}`
      );
    })
    .on("mouseleave", hideTip);

  // ── Gradient legend ─────────────────────────────────────────────────────────
  const defs = svg.append("defs");
  const gradId = "map-cscale";
  const lg = defs.append("linearGradient").attr("id", gradId);
  [0, .25, .5, .75, 1].forEach(t => {
    lg.append("stop").attr("offset", `${t * 100}%`)
      .attr("stop-color", colorScale(t * 30));
  });
  const legend = svg.append("g").attr("transform", `translate(${VW - 150},${VH - 22})`);
  legend.append("rect")
    .attr("width", 130).attr("height", 8).attr("rx", 2)
    .attr("fill", `url(#${gradId})`);
  legend.append("text").attr("class", "axis-lbl").attr("y", 18).text("0 % poor");
  legend.append("text").attr("class", "axis-lbl").attr("x", 130).attr("y", 18)
    .attr("text-anchor", "end").text("30 %+");

  // ── Update on state change ──────────────────────────────────────────────────
  function update(state) {
    paths
      .attr("fill", d => {
        const fips = String(d.id).padStart(5, "0");
        const row  = byFipsYear.get(fips)?.get(state.year);
        return row ? colorScale(row.pct_poor) : "#21262d";
      })
      .attr("stroke", d => {
        const fips = String(d.id).padStart(5, "0");
        return state.county === fips ? "#58a6ff" : "#21262d";
      })
      .attr("stroke-width", d => {
        const fips = String(d.id).padStart(5, "0");
        return state.county === fips ? 2 : 0.6;
      });
  }

  update(App.state);
  App.dispatch.on("stateChanged.map", update);
}
