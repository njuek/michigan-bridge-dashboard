# Michigan Bridge Infrastructure Visual Analytics Dashboard
### CIS 671 – Information Visualization | Final Project | GVSU Winter 2026

A single-page interactive D3.js dashboard that visualizes five years (2021–2025) of Michigan National Bridge Inventory (NBI) data across six coordinated views. The system enables infrastructure planners and policy-makers to locate geographic risk concentrations, track condition trends over time, compare counties, and discover relationships between bridge age, traffic load, and structural health.

---

## Table of Contents

1. [Live Demo / Running the Dashboard](#running-the-dashboard)
2. [Project Overview](#project-overview)
3. [Data](#data)
4. [Visualizations](#visualizations)
5. [Interactions](#interactions)
6. [File Structure](#file-structure)
7. [Setup & Preprocessing](#setup--preprocessing)
8. [Technologies](#technologies)
9. [Key Findings](#key-findings)

---

## Running the Dashboard

The dashboard fetches JSON files at runtime, so it **must be served over HTTP** — opening `index.html` directly as a `file://` URL will not work.

### Option A — Local server (Python, recommended)

```bash
# Navigate to the Final Project folder
cd "path/to/Final Project"

# Start server
python -m http.server 8080

# Open in browser
http://localhost:8080
```

Press `Ctrl+C` in the terminal to stop the server.

### Option B — Share with a teammate

Zip the entire **Final Project** folder and send it. The recipient unzips it, runs the Python command above, and visits `http://localhost:8080`. No installation required beyond Python 3.

### Option C — Publish online (Netlify Drop)

1. Go to **https://app.netlify.com/drop**
2. Drag the entire **Final Project** folder onto the page
3. A public URL is generated instantly (e.g., `https://random-name.netlify.app`)

> **Tip:** You can safely delete `data/bridges_all.json` (35 MB) before uploading — the live dashboard only loads `bridges_2025.json` and `county_summary.json`. This reduces the upload size significantly.

---

## Project Overview

### Problem

Michigan's 11,000+ bridges were largely built during the mid-twentieth century highway expansion and are aging faster than they are being repaired. Infrastructure managers at MDOT and county highway agencies must prioritize limited maintenance budgets across a large, heterogeneous bridge inventory. The NBI dataset contains 120+ attributes per bridge — far too many dimensions to interpret from raw tables or static reports.

### Solution

A visual analytics system built in D3.js that transforms five years of tabular NBI data into six coordinated, interactive views. All charts are linked through a shared state model: selecting a county on the map filters every other chart; the year slider updates the choropleth and bar chart in real time; the condition filter highlights matching bridges across all views.

### Task Abstraction (Munzner What–Why–How Framework)

| Task Type | Question Answered | Visualization |
|-----------|-------------------|---------------|
| **Locate** | Where are poor bridges geographically concentrated? | County choropleth map |
| **Compare** | How has Good/Fair/Poor changed 2021–2025? | Multi-line trend chart |
| **Summarize** | What is the current condition breakdown? | Donut chart |
| **Discover** | Do older / high-traffic bridges have lower ratings? | Scatter plot |
| **Compare** | Which counties have the highest % poor bridges? | Stacked bar chart |
| **Derive** | Which counties deteriorated most over 5 years? | County × year heatmap |

---

## Data

### Source

Federal Highway Administration (FHWA) **National Bridge Inventory (NBI)** — Michigan state records, inspection years 2021–2025. Publicly available through the FHWA NBI data download portal.

### Raw Files

| File | Year | Rows |
|------|------|------|
| `Michigan bridges 2021.csv` | 2021 | 11,284 |
| `Michigan bridges 2022.csv` | 2022 | 11,314 |
| `Michigan bridges 2023.csv` | 2023 | 11,341 |
| `Michigan bridges 2024.csv` | 2024 | 11,371 |
| `Michigan bridges 2025.csv` | 2025 | 11,397 |

Each CSV has **123 columns** following the FHWA NBI coding guide.

### Key Attributes Used

| NBI Field | Friendly Name | Type | Notes |
|-----------|--------------|------|-------|
| `LAT_016` / `LONG_017` | Coordinates | Quantitative (spatial) | NBI DDMMSSSS format → converted to decimal degrees |
| `COUNTY_CODE_003` | County | Categorical | 3-digit Michigan county code |
| `YEAR_BUILT_027` | Year Built | Quantitative (temporal) | Used to compute bridge age |
| `YEAR_RECONSTRUCTED_106` | Year Reconstructed | Quantitative (temporal) | Overrides year built for age if later |
| `ADT_029` | Average Daily Traffic | Quantitative | Encoded as dot size in scatter plot |
| `DECK_COND_058` | Deck Condition | Ordinal (0–9) | Component rating |
| `SUPERSTRUCTURE_COND_059` | Superstructure Condition | Ordinal (0–9) | Component rating |
| `SUBSTRUCTURE_COND_060` | Substructure Condition | Ordinal (0–9) | Component rating |
| `LOWEST_RATING` | Lowest Rating | Ordinal (0–9) | Min of the three component ratings |
| `BRIDGE_CONDITION` | Condition Class | Categorical (G/F/P) | Good (≥7), Fair (5–6), Poor (≤4) |
| `STRUCTURAL_EVAL_067` | Structural Evaluation | Ordinal (0–9) | Load-carrying capacity appraisal |

### Derived Fields (computed in `preprocess.py`)

| Field | Formula | Purpose |
|-------|---------|---------|
| `age` | `inspection_year − max(year_built, year_reconstructed)` | X-axis of scatter plot |
| `risk_score` | Average of deck, superstructure, substructure ratings | Composite health indicator |
| `condition_change` | `lowest_rating_2025 − lowest_rating_2021` | Negative = degraded; used in heatmap context |
| `county_fips` | `"26" + county_code` (zero-padded) | Joins NBI data to US Atlas TopoJSON |
| `county_name` | Lookup from Michigan county code table | Human-readable labels |

### Preprocessed Output Files (`data/`)

| File | Size | Used By | Description |
|------|------|---------|-------------|
| `bridges_2025.json` | 7.1 MB | Scatter plot, donut | One record per bridge, 2025 snapshot |
| `county_summary.json` | ~200 KB | Map, trends, bar, heatmap | 83 counties × 5 years, pre-aggregated |
| `bridges_all.json` | 35 MB | (not loaded at runtime) | All years combined; reserved for future use |

---

## Visualizations

### 1. County Choropleth Map
**File:** `js/map.js`

Colors Michigan's 83 counties by **% poor bridges** for the selected year using a red-yellow-green diverging scale (red = more poor, green = fewer poor). County boundaries are drawn from the US Atlas TopoJSON filtered to Michigan (FIPS prefix `26`), projected with `d3.geoMercator().fitExtent()`.

- Click any county to set the global county filter
- Selected county is highlighted with a blue 2px stroke
- Hover shows county name, bridge counts (G/F/P), and average rating

### 2. Condition Trend Lines (2021–2025)
**File:** `js/trends.js`

Three lines (Good / Fair / Poor) show the **percentage of Michigan bridges** in each condition class per year. Updates to show county-level trends when a county is selected. Uses `d3.curveMonotoneX` to smooth noise without misrepresenting the trend direction.

- Non-selected condition lines dim to 25% opacity when the condition filter is active
- Dots at each year support precise reading of values
- Y-axis is percentage (0–100%)

### 3. Condition Breakdown Donut
**File:** `js/donut.js`

A ring chart showing the **count and proportion** of Good, Fair, and Poor bridges for the active year and county. The hollow center displays total bridge count. Animated arc transitions run on every state change.

- Hover a slice to expand it and see exact count and percentage in tooltip
- Responds to year slider, county filter, and condition filter

### 4. Bridge Age vs. Condition Scatter Plot
**File:** `js/scatter.js`

Each dot is a bridge (up to 4,000 sampled from `bridges_2025.json`). **X = age**, **Y = lowest condition rating**, **color = G/F/P**, **dot size = ADT** (traffic volume, scaled by `d3.scaleSqrt` so area is perceptually proportional). Dashed reference lines mark the Poor threshold (rating ≤ 4) and Good threshold (rating ≥ 7).

- County filter highlights matching bridges and dims others
- Condition filter dims non-matching bridges to 6% opacity
- Hover shows bridge name, county, age, rating, ADT, and condition

### 5. Counties Ranked by % Poor (Stacked Bar)
**File:** `js/barchart.js`

Horizontal stacked bars for the **top 20 counties** ranked by % poor bridges in the selected year. Bar length = total bridges; segments = Good (green) / Fair (amber) / Poor (red). A text label at the right of each bar shows the % poor value. Animates on year change.

- Non-selected counties dim when a county is active
- Selected county label turns blue in the Y-axis

### 6. County × Year Condition Heatmap
**File:** `js/heatmap.js`

A matrix of the **top 20 counties by total bridge count** (rows) × **5 inspection years** (columns). Each cell is colored by average lowest condition rating using RdYlGn scale clamped to [4, 8]. Reading a row left-to-right shows a county's five-year trajectory.

- Selected county's row is highlighted with blue cell strokes and full opacity; others dim
- Hover shows county, year, average rating, poor count, and total

---

## Interactions

| Control | Location | Effect |
|---------|----------|--------|
| **Year slider** (2021–2025) | Header | Updates choropleth map + bar chart to show that year's data |
| **Condition buttons** (All / Good / Fair / Poor) | Header | Dims non-matching lines (trends) and dots (scatter) |
| **Click county on map** | Map panel | Filters trend lines, donut, scatter, and heatmap to that county |
| **Clear county (✕)** | Header (appears after click) | Resets all charts to statewide view |
| **Hover** | Any chart | Shared tooltip shows context-specific details |

All charts subscribe to a central `d3.dispatch("stateChanged")` event. State is stored in a single `App.state` object so all components stay in sync.

---

## File Structure

```
Final Project/
│
├── index.html                  # Dashboard shell — loads D3, TopoJSON, all JS modules
│
├── css/
│   └── dashboard.css           # Dark theme, grid layout, tooltip, axis styles
│
├── js/
│   ├── main.js                 # Data loading, shared App state, D3 dispatch, controls
│   ├── map.js                  # Component 1: County choropleth map
│   ├── trends.js               # Component 2: Multi-line condition trend chart
│   ├── donut.js                # Component 3: G/F/P donut chart
│   ├── scatter.js              # Component 4: Age vs. condition scatter plot
│   ├── barchart.js             # Component 5: Stacked bar — counties by % poor
│   └── heatmap.js              # Component 6: County × year heatmap
│
├── data/
│   ├── bridges_2025.json       # 11,396 bridges — 2025 snapshot (loaded at runtime)
│   ├── county_summary.json     # 83 counties × 5 years, pre-aggregated (loaded at runtime)
│   └── bridges_all.json        # 56,700 records across all years (not loaded at runtime)
│
├── preprocess.py               # Python preprocessing pipeline (Phase 1)
├── report_draft.md             # Final report draft
├── presentation_script.md      # 15-minute presentation script with timing
│
├── Michigan bridges 2021.csv   # Raw NBI data — source files
├── Michigan bridges 2022.csv
├── Michigan bridges 2023.csv
├── Michigan bridges 2024.csv
└── Michigan bridges 2025.csv
```

---

## Setup & Preprocessing

If you need to regenerate the JSON data files from scratch (e.g., after updating the raw CSVs):

**Requirements:** Python 3.10+ with no external libraries (uses only `csv`, `json`, `pathlib`, `collections` from the standard library).

```bash
cd "path/to/Final Project"
python preprocess.py
```

This will:
1. Merge all five Michigan NBI CSVs
2. Convert NBI DDMMSSSS coordinates to decimal degrees
3. Compute derived fields: `age`, `risk_score`, `condition_change`, `county_fips`, `county_name`
4. Filter out records with missing or out-of-bounds coordinates
5. Export `data/bridges_all.json`, `data/bridges_2025.json`, `data/county_summary.json`

Expected output:
```
Loaded 56,707 total rows across 5 years
56,700 records after cleaning
Writing bridges_all.json...   56,700 records -> 35.2 MB
Writing bridges_2025.json...  11,396 records ->  7.1 MB
Writing county_summary.json... 415 county-year records
```

---

## Technologies

| Technology | Version | Role |
|-----------|---------|------|
| [D3.js](https://d3js.org) | v7 | All visualizations and data binding |
| [TopoJSON Client](https://github.com/topojson/topojson-client) | v3 | Decoding US Atlas county boundaries |
| [US Atlas TopoJSON](https://github.com/topojson/us-atlas) | v3 | Michigan county geographic data (CDN) |
| Python | 3.10+ | Data preprocessing (`preprocess.py`) |
| HTML5 / CSS3 | — | Dashboard layout (CSS Grid) and styling |

No build tools, package managers, or frameworks are required. The dashboard runs entirely in the browser from static files.

---

## Key Findings

| Finding | Statistic |
|---------|-----------|
| Good bridges declined 2021→2025 | 36.3% → 33.1% (−3.2 pp) |
| Fair bridges increased 2021→2025 | 52.8% → 55.9% (+3.1 pp) |
| Poor bridges (2025) | 1,250 bridges (11.0%) |
| Bridges degraded since 2021 | 2,729 bridges |
| Bridges improved since 2021 | 858 bridges |
| Average bridge age (2025) | 39.4 years (median: 37 years) |
| Bridges over 50 years old | 3,671 (32.2% of inventory) |
| Bridges over 70 years old | 939 bridges |
| Worst county by % poor (2025) | Benzie — 28.0% poor (7/25 bridges) |
| Worst county by absolute poor count | Wayne, Oakland, Genesee |

The dominant pattern is **Good-to-Fair migration** driven by systematic aging — not acute structural failure. Rural counties carry disproportionate risk relative to their resources, while high-traffic older bridges represent the most critical maintenance targets.

---

## Author

**Kelvin Njue**
Grand Valley State University — CIS 671 Information Visualization, Winter 2026
