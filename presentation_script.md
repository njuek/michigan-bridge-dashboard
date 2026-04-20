# Presentation Script — Michigan Bridge Infrastructure Dashboard
## CIS 671 Final Project | Target: ~15 minutes

---

### SLIDE 1 — Title & Motivation (1 min)

**Say:**
"Michigan has over 11,000 bridges. Many were built during the 1950s and 60s highway expansion, and they're aging. Infrastructure managers at MDOT and county agencies face a hard question every budget cycle: *which* bridges need attention now, and *where* should limited dollars go?

The raw NBI data has over 120 columns per bridge — you can't answer that from a spreadsheet. That's our visualization problem."

---

### SLIDE 2 — Data Description (1.5 min)

**Show:** Table of key attributes.

**Say:**
"We used the Federal Highway Administration's National Bridge Inventory for Michigan, five consecutive years — 2021 through 2025. That's about 11,300 bridges per year, roughly 57,000 total records.

The data is tabular, but with geospatial coordinates for every bridge, temporal snapshots per year, ordinal condition ratings from 0 to 9, and quantitative fields like traffic volume and bridge age.

We preprocessed in Python — converting coordinates from NBI's degree-minute-second encoding to decimal degrees, computing derived fields like bridge age and a 5-year condition change score, and exporting three JSON files for D3."

---

### SLIDE 3 — Task Abstraction (1.5 min)

**Show:** What–Why–How table.

**Say:**
"Following Munzner's framework, we defined five core tasks before picking any chart types.

We need to *locate* where risk is concentrated spatially — that points to a map. We need to *compare* condition trends over time — that's a line chart. We need to *discover* the relationship between age, traffic, and condition — a scatter plot. We need to *summarize* the current state at a glance — a donut. And we need to *derive* which counties are deteriorating fastest over five years — a heatmap.

Every design decision flows from these tasks."

---

### SLIDE 4 — Dashboard Overview (0.5 min)

**Show:** Full dashboard screenshot.

**Say:**
"Here's the complete dashboard — a single page, six D3 views, all linked. A year slider controls the map and bar chart. Clicking any county on the map filters every other chart to that county. A condition button fades out non-matching bridges on the scatter plot and trends. Let me walk through each visualization."

---

### SLIDE 5 — Chart 1: County Choropleth Map (2 min)

**Show:** Map screenshot + zoom into worst-performing counties.

**Say:**
"The choropleth maps % poor bridges per county using a red-yellow-green diverging scale — red means a high share of poor bridges.

Why a choropleth? It's the most efficient idiom for county-level spatial comparison. Color saturation encodes the continuous % poor value across 83 counties simultaneously.

*[Demonstrate click on Benzie County.]*

What we found: the worst counties are uniformly rural — Benzie at 28% poor, Iron at 22%, Branch and Barry around 22%. These are not the counties with the most bridges; they're the ones with the fewest resources to maintain them. That's a policy equity finding that would be invisible in a statewide aggregate."

---

### SLIDE 6 — Chart 2: Condition Trend Lines (2 min)

**Show:** Trend line chart — statewide, then with a county selected.

**Say:**
"Three lines show the percentage of Good, Fair, and Poor bridges each year from 2021 to 2025. The x-axis is year, y-axis is percentage, and colors match the G/F/P system used everywhere in the dashboard.

The key insight: Good dropped from 36.3% to 33.1% over five years. Fair rose from 52.8% to 55.9%. Poor stayed nearly flat at 11%.

This means Michigan isn't facing acute structural failures — it's facing diffuse aging. Good bridges are sliding into Fair. If that trend continues without intervention, today's Fair bridges become tomorrow's Poor bridges.

*[Select a rural county — the trend lines update to show county-level data, often a steeper decline.]*"

---

### SLIDE 7 — Chart 3: Condition Breakdown Donut (1.5 min)

**Show:** Donut chart — statewide and county-filtered.

**Say:**
"The donut gives an at-a-glance part-to-whole summary for the selected year and county. Arc angle encodes proportion. The center shows total bridge count for scale.

For Michigan in 2025: 3,777 Good, 6,369 Fair, 1,250 Poor.

When I filter to a small county like Iron, the donut immediately shows the disproportionate poor share — confirming what the map signaled, with precise counts."

---

### SLIDE 8 — Chart 4: Scatter Plot — Age vs. Condition (2 min)

**Show:** Scatter plot — full, then with condition filter applied.

**Say:**
"The scatter plots bridge age on the x-axis against lowest condition rating on the y-axis. Each dot is a bridge — color is its G/F/P classification, and size represents ADT traffic volume. The two dashed lines mark the Poor threshold at rating 4 and the Good threshold at rating 7.

Why scatter? It's the right idiom for exploring two-quantitative-variable correlation. The size channel adds ADT as a third dimension without a separate chart.

What we see: bridges older than 70 years cluster in the lower half of the chart — Fair and Poor territory. The most critical assets are the *large circles in the red zone* — high-traffic bridges with poor structural ratings. Michigan has 939 bridges over 70 years old.

The condition filter dims non-matching bridges, so clicking 'Poor' immediately isolates every poor bridge by age and traffic load."

---

### SLIDE 9 — Chart 5: County Rankings Bar Chart (1.5 min)

**Show:** Stacked bar chart.

**Say:**
"This horizontal stacked bar ranks the 20 worst counties by % poor bridges for the selected year. Bar length is total bridges; segments show Good, Fair, and Poor counts; the percentage label at the right gives the key comparison value.

The insight this reveals that the map alone can't: the distinction between *high proportion* and *high absolute count*. A county like Benzie has 28% poor bridges but only 25 total — seven bridges. Wayne County has a much lower % poor but hundreds more poor bridges in absolute terms. Both matter for policy, but differently. The bar chart makes that trade-off explicit."

---

### SLIDE 10 — Chart 6: Heatmap — County × Year (1.5 min)

**Show:** Heatmap.

**Say:**
"The final view is a heatmap of the 20 largest counties (by bridge count) against five years. Each cell is colored by average lowest condition rating — red = lower = worse.

Reading across a county's row left to right shows its five-year trajectory. Most rows show a subtle shift toward redder cells — consistent with the trend line story.

This chart answers the derive task: which counties show the most sustained deterioration? Counties where every cell from 2021 to 2025 is in the orange-red range are chronic underperformers, likely needing systemic intervention rather than bridge-by-bridge patching."

---

### SLIDE 11 — Summary of Findings (1 min)

**Say:**
"To summarize: Michigan's bridges are aging faster than they're being repaired — 2,729 bridges degraded from 2021 to 2025, while only 858 improved. The dominant pattern is Good-to-Fair migration, not acute failure. Rural counties carry disproportionate risk, and the 939 bridges over 70 years old with high traffic loads are the highest priority maintenance targets.

The dashboard makes all of this visible, explorable, and filterable in a single coordinated interface."

---

### SLIDE 12 — Conclusion & Demo (0.5 min)

**Say:**
"The dashboard translates five years of tabular NBI data into six coordinated views that support locate, compare, discover, summarize, and derive tasks. The linked interaction model — map click, year slider, condition filter — lets a user move from statewide overview to county-level detail without losing context.

Thank you. I'm happy to answer questions or walk through any part of the dashboard live."

---

## Timing Checklist

| Section | Target |
|---------|--------|
| Title + Motivation | 1 min |
| Data | 1.5 min |
| Task Abstraction | 1.5 min |
| Dashboard Overview | 0.5 min |
| Map | 2 min |
| Trend Lines | 2 min |
| Donut | 1.5 min |
| Scatter | 2 min |
| Bar Chart | 1.5 min |
| Heatmap | 1.5 min |
| Findings | 1 min |
| Conclusion | 0.5 min |
| **Total** | **~17 min — trim scatter/donut to fit 15 min** |

---

## Screenshots Needed (for report + slides)

1. Full dashboard (all 6 panels visible)
2. Choropleth map — statewide 2025
3. Choropleth map — with worst county selected (Benzie or Iron)
4. Trend line chart — statewide (shows Good declining)
5. Donut chart — statewide 2025
6. Scatter plot — all bridges
7. Scatter plot — "Poor" condition filter active
8. Bar chart — 2025 year
9. Heatmap — statewide (no county filter)
