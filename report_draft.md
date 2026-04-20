# Michigan Bridge Infrastructure Visual Analytics System (2021–2025)

**Kelvin Njue | CIS 671 – Information Visualization | Grand Valley State University | Winter 2026**

---

## 1. Introduction and Task Definition

Michigan's road network depends on more than 11,000 bridges, many of which were built during the mid-twentieth century interstate expansion. Infrastructure managers at the Michigan Department of Transportation (MDOT), county highway agencies, and state policy-makers face a persistent challenge: determining *which* bridges require attention, *where* structural risk is concentrated geographically, and *how* conditions have evolved over time. This challenge is inherently a visualization problem. The National Bridge Inventory (NBI) dataset for Michigan contains over 120 attributes per bridge including condition ratings, traffic load, age, and geospatial coordinates — far too many dimensions to assess from raw tables or static reports alone.

This project builds a visual analytics dashboard that transforms five years of Michigan NBI data (2021–2025) into six coordinated, interactive D3 visualizations. Together they allow a user to:

1. **Locate** geographic concentrations of structurally deficient bridges across Michigan's 83 counties.
2. **Compare** how the proportion of Good, Fair, and Poor bridges has shifted from 2021 to 2025.
3. **Discover** the relationship between a bridge's age, traffic load, and its current condition rating.
4. **Summarize** the statewide or county-level breakdown of bridge health at any selected inspection year.
5. **Derive** which counties have experienced the greatest sustained deterioration across the five-year window.

The target users are infrastructure planners and policy-makers who need to prioritize maintenance investment across a large, heterogeneous bridge inventory. The visualization problem arises because the data is simultaneously spatial (83 counties), temporal (5 annual snapshots), multivariate (condition ratings, age, traffic, owner type), and at scale (>11,000 bridges per year).

---

## 2. Data Description

**Source:** Federal Highway Administration (FHWA) National Bridge Inventory (NBI), Michigan state records for inspection years 2021 through 2025. The data is publicly available through the FHWA's NBI data download portal.

**Dataset type:** Tabular (CSV), one row per bridge per inspection year, with strong geospatial and temporal dimensions.

**Scale:** 11,282 bridges (2021) to 11,396 bridges (2025), totaling 56,707 bridge-year records across the five years after coordinate validation.

**Key attributes used:**

| Attribute | NBI Field | Type | Description |
|-----------|-----------|------|-------------|
| Geographic coordinates | LAT_016, LONG_017 | Quantitative (spatial) | Bridge location in NBI DDMMSSSS format, converted to decimal degrees |
| County code | COUNTY_CODE_003 | Categorical (nominal) | 3-digit Michigan county FIPS suffix |
| Year built | YEAR_BUILT_027 | Quantitative (temporal) | Construction year; used to compute bridge age |
| Year reconstructed | YEAR_RECONSTRUCTED_106 | Quantitative (temporal) | Major reconstruction year (overrides year built for age computation) |
| Average Daily Traffic | ADT_029 | Quantitative | Daily vehicle count; used as size encoding in scatter plot |
| Deck condition | DECK_COND_058 | Ordinal (0–9) | Physical condition of the bridge deck |
| Superstructure condition | SUPERSTRUCTURE_COND_059 | Ordinal (0–9) | Condition of load-bearing structural elements |
| Substructure condition | SUBSTRUCTURE_COND_060 | Ordinal (0–9) | Condition of foundations and piers |
| Lowest rating | LOWEST_RATING | Ordinal (0–9) | Minimum of the three component ratings |
| Bridge condition | BRIDGE_CONDITION | Categorical (G/F/P) | FHWA-classified: Good (≥7), Fair (5–6), Poor (≤4) |
| Structural evaluation | STRUCTURAL_EVAL_067 | Ordinal (0–9) | Overall load-carrying capacity appraisal |

**Derived attributes (computed during preprocessing):**

- **Age** = inspection year − max(year_built, year_reconstructed)
- **Risk score** = average of deck, superstructure, and substructure condition ratings (lower = higher risk)
- **Condition change** = difference in LOWEST_RATING between the bridge's 2021 and 2025 records (negative = degraded)

**Preprocessing** was performed in Python using the `csv`, `json`, and `collections` modules. The five CSV files were merged, coordinates converted from NBI degree-minute-second encoding to decimal degrees, invalid records filtered (missing coordinates or outside Michigan's bounding box), and three output JSON files produced for D3 consumption: `bridges_all.json` (all years, 56,700 records), `bridges_2025.json` (2025 snapshot, 11,396 records), and `county_summary.json` (83 counties × 5 years, pre-aggregated).

---

## 3. Task Abstraction

This project applies Munzner's What–Why–How framework to structure the visualization design around analytical goals rather than chart conventions.

**Why (actions):**

| Action | Target | Visualization |
|--------|--------|---------------|
| **Locate** | Features (counties with high % poor bridges) | County choropleth map |
| **Compare** | Distributions (G/F/P trends across years) | Multi-line trend chart |
| **Compare** | Rankings (counties by % poor) | Stacked horizontal bar |
| **Discover** | Correlation (age × ADT × condition rating) | Scatter plot |
| **Summarize** | Distribution (statewide or county condition breakdown) | Donut chart |
| **Derive** | Change (condition degradation by county over 5 years) | County × year heatmap |

**What (data):** The NBI dataset is primarily tabular with geospatial attributes (lat/lng), temporal attributes (year built, inspection year), ordinal attributes (condition ratings 0–9), categorical attributes (G/F/P classification, county, owner), and quantitative attributes (ADT, bridge length, deck area). The **items** are individual bridges; the **attributes** span all dimensions above; the **links** are implicit through shared county and year identifiers.

**How (idioms):** The dashboard selects idioms based on the task each view must support: choropleths for spatial aggregation, line charts for temporal trends, scatter plots for two-quantitative-variable correlation, donut charts for part-to-whole summary, stacked bars for ranked comparison, and heatmaps for matrix-structured change detection.

---

## 4. Visualizations

### 4.1 County Choropleth Map

**[Insert screenshot of choropleth map]**

**Purpose:** To answer the spatial location task — *where* in Michigan is structural deficiency concentrated?

**Visual encodings:**
- **Color hue and saturation** encodes % poor bridges per county using a diverging RdYlGn color scale (red = high % poor, yellow = moderate, green = low). The scale is clamped at 0%–30%+, since no Michigan county exceeds 30% poor.
- **County boundary** (SVG path projected via `d3.geoMercator().fitExtent()`) provides the spatial context.
- **Stroke color and width** highlights the user-selected county (blue outline, 2px) for cross-chart linking.

**Rationale:** A choropleth is the natural choice for county-level spatial comparison. Color saturation encodes the continuous % poor variable more efficiently than symbol size, which would clutter the map. The RdYlGn scale maps intuitively to a quality judgment (red = bad, green = good) without requiring a legend interpretation step.

**Interaction:** Clicking any county sets the global county filter, causing the trend lines, donut, scatter, bar chart, and heatmap to all update to show only that county's bridges.

**How it was produced:** Michigan county features were extracted from the US Atlas counties TopoJSON (CDN) by filtering features where the 5-digit FIPS code starts with "26" (Michigan). The `d3.geoMercator().fitExtent()` call fits the projection to the Michigan extent with a 20px margin on each side. Color values are drawn from `county_summary.json` indexed by `county_fips` and `year`.

**Insights enabled:** In 2025, the highest % poor counties are rural Upper Peninsula and southwest Lower Peninsula counties: Benzie (28.0%), Iron (22.2%), Branch (22.0%), Barry (21.7%), and Gogebic (21.6%). These small rural counties typically lack the funding base of larger counties like Wayne or Oakland, suggesting an equity dimension in bridge maintenance investment.

---

### 4.2 Condition Trend Lines (2021–2025)

**[Insert screenshot of trend line chart]**

**Purpose:** To track how the proportion of Good, Fair, and Poor bridges has changed over the five-year window — statewide or within a selected county.

**Visual encodings:**
- **Position (x-axis):** Inspection year (2021–2025), quantitative.
- **Position (y-axis):** Percentage of bridges in each condition category (0–100%), quantitative.
- **Color hue:** Good (green), Fair (amber), Poor (red) — consistent with the dashboard's color system.
- **Line stroke:** Three separate paths, one per condition; non-selected conditions dim to 25% opacity when the condition filter is active.
- **Dots:** 3.5px circles at each data point to aid reading discrete year values.

**Rationale:** A multi-line chart is the most effective idiom for comparing multiple temporal series. Connecting dots with lines emphasizes continuity and trend direction. Using the same G/F/P colors as all other charts creates a consistent visual language that reduces cognitive load.

**How it was produced:** Data is aggregated on the fly from `county_summary.json`. For each year, rows are filtered by the active county (if any) and summed to produce statewide counts. The line generator uses `d3.curveMonotoneX` to smooth small year-to-year jitter without overstating trends. The chart re-draws on every `stateChanged` dispatch event.

**Insights enabled:** From 2021 to 2025, the Good percentage fell from **36.3% to 33.1%** while the Fair percentage rose from **52.8% to 55.9%**. The Poor percentage remained nearly stable (11.0% → 11.0%), suggesting that Good bridges are migrating to Fair rather than collapsing directly to Poor — a pattern consistent with gradual aging rather than acute structural failure. This is a critical finding for maintenance budget planning: the problem is diffuse deterioration across the Fair category, not concentrated acute failures.

---

### 4.3 Condition Breakdown Donut Chart

**[Insert screenshot of donut chart]**

**Purpose:** To summarize the count and proportion of Good, Fair, and Poor bridges for the selected year and county — providing an at-a-glance health indicator.

**Visual encodings:**
- **Arc angle:** Encodes the proportion of each condition category (part-to-whole relationship).
- **Color hue:** G/F/P consistent with dashboard color system.
- **Center text:** Total bridge count (or county name when filtered) for immediate context.
- **Legend text:** Count and percentage for each slice, updated on every state change.

**Rationale:** A donut chart communicates part-to-whole relationships effectively for three categories. The hollow center is used for a summary statistic (total count) that would otherwise require a separate element. Hover behavior expands the hovered slice and shows the tooltip with exact values, supporting more precise reading than angle estimation alone.

**How it was produced:** Counts are aggregated from `county_summary.json` for the selected year and county. `d3.pie()` computes arc angles and `d3.arc()` renders them. Transitions use `.attrTween("d", ...)` with `d3.interpolate()` for smooth animated updates between state changes.

**Insights enabled:** At the Michigan statewide level in 2025: **3,777 Good (33.1%), 6,369 Fair (55.9%), 1,250 Poor (11.0%)**. When filtered to a county like Iron or Branch, the donut immediately surfaces disproportionate poor rates, confirming the map's visual signal with precise counts.

---

### 4.4 Bridge Age vs. Condition Scatter Plot

**[Insert screenshot of scatter plot]**

**Purpose:** To discover whether older bridges tend to have lower condition ratings, and how traffic load (ADT) interacts with this relationship.

**Visual encodings:**
- **Position (x-axis):** Bridge age in years (quantitative).
- **Position (y-axis):** Lowest condition rating 0–9 (ordinal, treated as quantitative for scaling).
- **Color hue:** Bridge condition category (G = green, F = amber, P = red).
- **Circle size (area):** ADT (Average Daily Traffic), scaled via `d3.scaleSqrt()` so area is proportional to traffic volume.
- **Opacity:** 55% for active points; 6% for filtered-out points.
- **Reference lines:** Dashed horizontal lines at ratings 4 (Poor threshold) and 7 (Good threshold) aid interpretation without requiring legend lookup.

**Rationale:** A scatter plot is the optimal idiom for exploring the correlation between two quantitative variables. Using a third encoding channel (size) for ADT allows a three-variable relationship to be explored simultaneously. `scaleSqrt` is used for radius so that visual area (proportional to traffic) rather than radius is the perceptual quantity. Opacity prevents overplotting at 11,396 points. A sample of up to 4,000 bridges is drawn for rendering performance.

**How it was produced:** Points are drawn from `bridges_2025.json`. The county and condition filters dim non-matching points via a `.transition().duration(200)` on opacity and radius. Two threshold lines are rendered as `<line>` elements with `stroke-dasharray` styling.

**Insights enabled:** The scatter plot reveals a clear downward-right trend: bridges built before 1960 (65+ years old) cluster heavily in the Fair and Poor rating bands. Larger circles (high ADT) appear throughout all condition bands, but the cluster of large-circle Poor bridges represents the highest-priority maintenance targets — high-traffic bridges with structural deficiencies. Bridges over 50 years old account for **3,671 of 11,396** (32.2%) of Michigan's inventory.

---

### 4.5 Counties Ranked by % Poor Bridges (Stacked Bar Chart)

**[Insert screenshot of bar chart]**

**Purpose:** To compare counties by their proportion of poor bridges for the selected year, and to show the full G/F/P composition of each county's bridge inventory.

**Visual encodings:**
- **Position (y-axis):** County name, ranked by % poor (descending).
- **Bar length (x-axis):** Total bridge count per county.
- **Color (stacked segments):** Good (green), Fair (amber), Poor (red) — same color system.
- **Text label:** % poor annotation at the end of each bar for quick comparison.
- **Opacity:** Non-selected counties dim to 25% when a county is active.

**Rationale:** A horizontal stacked bar chart is well-suited to ranked comparisons where categories sum to a meaningful total. Horizontal orientation accommodates county name labels without rotation. Showing the absolute count (bar length) alongside the % poor annotation (text) provides both absolute and relative context simultaneously.

**How it was produced:** Data is drawn from `county_summary.json`, filtered to the selected year and sorted by `pct_poor` descending, taking the top 20. `d3.stack()` decomposes each county's bar into three segments. The chart animates with `.transition().duration(300)` when the year changes.

**Insights enabled:** The bar chart confirms that rural counties (Benzie, Iron, Branch, Barry, Gogebic) consistently top the poor-percentage ranking, while large urban counties (Wayne, Oakland, Kent) rank near the bottom despite having larger absolute counts of poor bridges. This distinction — high *proportion* vs. high *absolute count* — is only visible through this dual encoding.

---

### 4.6 County × Year Condition Heatmap

**[Insert screenshot of heatmap]**

**Purpose:** To derive which counties have experienced the most sustained or rapid condition deterioration over the 2021–2025 period by showing the average lowest rating per county per year as a color matrix.

**Visual encodings:**
- **Position (x-axis):** Year (2021–2025), as a band scale.
- **Position (y-axis):** County name — the 20 counties with the highest total bridge count in 2025.
- **Color hue and value:** Average lowest condition rating per county-year, using a RdYlGn diverging scale clamped to [4, 8]. Redder cells = lower average rating = more deterioration.
- **Cell stroke:** Blue (2px) highlights the selected county.
- **Opacity:** Non-selected counties dim to 35% when a county is active.

**Rationale:** A heatmap is the most space-efficient idiom for a matrix of (county × year) values. The color encoding allows a user to visually trace a county's row left-to-right to see whether its rating has improved or declined, and to compare rows to identify which counties are systematically redder (worse). The 20-county scope targets the largest counties — those with the most policy impact — without overwhelming the display.

**How it was produced:** The top 20 counties are identified once from the 2025 `county_summary.json` data and kept fixed (stable row ordering). `d3.scaleBand()` positions rows and columns; `d3.scaleSequential(d3.interpolateRdYlGn)` maps rating values to color. A linear gradient legend is rendered via an SVG `<defs>` element.

**Insights enabled:** The heatmap reveals that counties like Wayne and Genesee (the state's largest bridge inventories) show stable or slightly declining average ratings, while Macomb and Oakland show more stable conditions. Scanning each row left-to-right, the majority of the 20 largest counties show a slight reddening trend from 2021 to 2025 — consistent with the statewide trend chart showing Good % declining over the period.

---

## 5. Summary of Findings

The five-year Michigan NBI data tells a clear and actionable story:

1. **Michigan's bridges are aging faster than they are being repaired.** From 2021 to 2025, 2,729 bridges degraded in condition while only 858 improved. The average bridge age is **39.4 years** (median 37), with 939 bridges over 70 years old.

2. **The dominant problem is Good-to-Fair degradation, not collapse.** The Good percentage fell from 36.3% to 33.1% while Fair rose from 52.8% to 55.9%. Poor remained stable near 11%, suggesting systematic aging is the policy concern rather than acute structural failure.

3. **Rural counties bear disproportionate risk.** The highest % poor counties are uniformly rural (Benzie 28.0%, Iron 22.2%, Branch 22.0%, Barry 21.7%, Gogebic 21.6%), pointing to a resource equity problem distinct from the large absolute counts in urban counties.

4. **Age and traffic load interact with condition.** Bridges older than 50 years account for 32.2% of Michigan's inventory and disproportionately appear in the Fair and Poor rating bands on the scatter plot, especially when combined with high ADT — identifying the highest-priority maintenance targets.

5. **The problem is statewide, not isolated.** The heatmap shows that even Michigan's 20 largest counties — with the most resources — show gradual rating declines over the five-year window.

---

## 6. Conclusion

This visual analytics system translates five years of raw National Bridge Inventory tabular data into six coordinated D3 visualizations that enable infrastructure planners to locate, compare, discover, summarize, and derive insights about Michigan bridge health. The linked interaction model — county click, year slider, and condition filter — allows a user to move fluidly between statewide overview and county-level drill-down without losing context. The dashboard confirms that Michigan's bridge infrastructure faces a diffuse, sustained aging challenge concentrated in rural counties and older bridge stock, providing the analytical foundation for evidence-based maintenance prioritization.

---

## References

- Federal Highway Administration. *National Bridge Inventory Data.* U.S. Department of Transportation. Retrieved from the FHWA NBI download portal.
- Munzner, T. (2014). *Visualization Analysis and Design.* CRC Press.
- Bostock, M. *D3.js – Data-Driven Documents.* https://d3js.org (v7)
- US Census Bureau. *TIGER/Line Shapefiles — Michigan Counties.* (Accessed via US Atlas TopoJSON, https://github.com/topojson/us-atlas)
