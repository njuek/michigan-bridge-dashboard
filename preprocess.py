"""
Phase 1 – Michigan Bridge Data Preprocessing
Merges 2021-2025 NBI CSVs, cleans/derives fields, and exports 3 JSON files
for the D3 dashboard:
  - bridges_all.json      : one record per bridge-year (temporal views)
  - bridges_2025.json     : 2025 snapshot (map + current-state charts)
  - county_summary.json   : aggregated by county x year (choropleth / heatmap)
"""

import csv
import json
import math
from pathlib import Path
from collections import defaultdict

# ---------------------------------------------------------------------------
# Michigan county code -> name mapping (NBI 3-digit codes)
# ---------------------------------------------------------------------------
MICHIGAN_COUNTIES = {
    "001": "Alcona", "003": "Alger", "005": "Allegan", "007": "Alpena",
    "009": "Antrim", "011": "Arenac", "013": "Baraga", "015": "Barry",
    "017": "Bay", "019": "Benzie", "021": "Berrien", "023": "Branch",
    "025": "Calhoun", "027": "Cass", "029": "Charlevoix", "031": "Cheboygan",
    "033": "Chippewa", "035": "Clare", "037": "Clinton", "039": "Crawford",
    "041": "Delta", "043": "Dickinson", "045": "Eaton", "047": "Emmet",
    "049": "Genesee", "051": "Gladwin", "053": "Gogebic", "055": "Grand Traverse",
    "057": "Gratiot", "059": "Hillsdale", "061": "Houghton", "063": "Huron",
    "065": "Ingham", "067": "Ionia", "069": "Iosco", "071": "Iron",
    "073": "Isabella", "075": "Jackson", "077": "Kalamazoo", "079": "Kalkaska",
    "081": "Kent", "083": "Keweenaw", "085": "Lake", "087": "Lapeer",
    "089": "Leelanau", "091": "Lenawee", "093": "Livingston", "095": "Luce",
    "097": "Mackinac", "099": "Macomb", "101": "Manistee", "103": "Marquette",
    "105": "Mason", "107": "Mecosta", "109": "Menominee", "111": "Midland",
    "113": "Missaukee", "115": "Monroe", "117": "Montcalm", "119": "Montmorency",
    "121": "Muskegon", "123": "Newaygo", "125": "Oakland", "127": "Oceana",
    "129": "Ogemaw", "131": "Ontonagon", "133": "Osceola", "135": "Oscoda",
    "137": "Otsego", "139": "Ottawa", "141": "Presque Isle", "143": "Roscommon",
    "145": "Saginaw", "147": "Saint Clair", "149": "Saint Joseph", "151": "Sanilac",
    "153": "Schoolcraft", "155": "Shiawassee", "157": "Tuscola", "159": "Van Buren",
    "161": "Washtenaw", "163": "Wayne", "165": "Wexford",
}

# NBI structure kind codes -> human-readable
STRUCTURE_KIND = {
    "1": "Concrete", "2": "Concrete Continuous", "3": "Steel",
    "4": "Steel Continuous", "5": "Prestressed Concrete",
    "6": "Prestressed Concrete Continuous", "7": "Wood/Timber",
    "8": "Masonry", "9": "Aluminum/Wrought Iron", "0": "Other",
}

OWNER_CODES = {
    "01": "State Highway Agency", "02": "County Highway Agency",
    "03": "Town/Township", "04": "City/Municipal", "11": "Federal (FHWA)",
    "12": "Federal (BIA)", "21": "Railroad", "25": "Other Local",
    "26": "Private", "27": "Railroad-State",
}


# ---------------------------------------------------------------------------
# Coordinate conversion: NBI DDMMSSSS / DDDMMSSSS -> decimal degrees
# ---------------------------------------------------------------------------
def parse_lat(raw: str) -> float | None:
    raw = raw.strip()
    if not raw or raw == "0":
        return None
    try:
        v = int(raw)
        # DDMMSSSS  (8 digits)
        dd = v // 1_000_000
        mm = (v % 1_000_000) // 10_000
        ss = (v % 10_000) / 100
        return round(dd + mm / 60 + ss / 3600, 6)
    except (ValueError, ZeroDivisionError):
        return None


def parse_lon(raw: str) -> float | None:
    raw = raw.strip()
    if not raw or raw == "0":
        return None
    try:
        v = int(raw)
        # DDDMMSSSS (9 digits)
        ddd = v // 1_000_000
        mm = (v % 1_000_000) // 10_000
        ss = (v % 10_000) / 100
        deg = round(ddd + mm / 60 + ss / 3600, 6)
        return -deg  # Michigan is west longitude
    except (ValueError, ZeroDivisionError):
        return None


def parse_rating(val: str) -> int | None:
    val = val.strip()
    if val in ("", "N", "n"):
        return None
    try:
        return int(float(val))
    except ValueError:
        return None


def parse_int(val: str) -> int | None:
    try:
        return int(float(val.strip()))
    except (ValueError, AttributeError):
        return None


def parse_float(val: str) -> float | None:
    try:
        return round(float(val.strip()), 2)
    except (ValueError, AttributeError):
        return None


def compute_risk_score(deck, sup, sub) -> float | None:
    """Average of available condition ratings; lower = higher risk."""
    vals = [v for v in (deck, sup, sub) if v is not None]
    if not vals:
        return None
    return round(sum(vals) / len(vals), 2)


# ---------------------------------------------------------------------------
# Load and merge all years
# ---------------------------------------------------------------------------
DATA_DIR = Path(__file__).parent
YEARS = [2021, 2022, 2023, 2024, 2025]

KEEP_COLS = [
    "STRUCTURE_NUMBER_008",
    "COUNTY_CODE_003",
    "HIGHWAY_DISTRICT_002",
    "LAT_016",
    "LONG_017",
    "FEATURES_DESC_006A",
    "FACILITY_CARRIED_007",
    "LOCATION_009",
    "YEAR_BUILT_027",
    "YEAR_RECONSTRUCTED_106",
    "ADT_029",
    "PERCENT_ADT_TRUCK_109",
    "DECK_COND_058",
    "SUPERSTRUCTURE_COND_059",
    "SUBSTRUCTURE_COND_060",
    "CHANNEL_COND_061",
    "CULVERT_COND_062",
    "STRUCTURAL_EVAL_067",
    "BRIDGE_CONDITION",
    "LOWEST_RATING",
    "DECK_AREA",
    "STRUCTURE_LEN_MT_049",
    "OWNER_022",
    "STRUCTURE_KIND_043A",
    "OPEN_CLOSED_POSTED_041",
    "SCOUR_CRITICAL_113",
    "DATE_OF_INSPECT_090",
]

print("Loading CSVs...")
all_records = []

for year in YEARS:
    path = DATA_DIR / f"Michigan bridges {year}.csv"
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            r = {"year": year}
            for col in KEEP_COLS:
                r[col] = row.get(col, "").strip()
            all_records.append(r)

print(f"  Loaded {len(all_records):,} total rows across {len(YEARS)} years")


# ---------------------------------------------------------------------------
# Clean and derive fields
# ---------------------------------------------------------------------------
print("Cleaning and deriving fields...")

clean_records = []

for r in all_records:
    year = r["year"]

    struct_id = r["STRUCTURE_NUMBER_008"].strip("'").strip()
    county_code = r["COUNTY_CODE_003"].zfill(3)
    county_name = MICHIGAN_COUNTIES.get(county_code, f"County {county_code}")
    county_fips = f"26{county_code}"   # Michigan FIPS prefix = 26

    lat = parse_lat(r["LAT_016"])
    lng = parse_lon(r["LONG_017"])

    year_built = parse_int(r["YEAR_BUILT_027"])
    year_recon = parse_int(r["YEAR_RECONSTRUCTED_106"])
    effective_year = year_recon if year_recon and year_recon > (year_built or 0) else year_built
    age = (year - effective_year) if effective_year else None

    adt = parse_int(r["ADT_029"])
    pct_truck = parse_float(r["PERCENT_ADT_TRUCK_109"])
    deck_area = parse_float(r["DECK_AREA"])
    length_m = parse_float(r["STRUCTURE_LEN_MT_049"])

    deck = parse_rating(r["DECK_COND_058"])
    sup = parse_rating(r["SUPERSTRUCTURE_COND_059"])
    sub = parse_rating(r["SUBSTRUCTURE_COND_060"])
    culvert = parse_rating(r["CULVERT_COND_062"])
    lowest = parse_rating(r["LOWEST_RATING"])
    struct_eval = parse_rating(r["STRUCTURAL_EVAL_067"])

    risk_score = compute_risk_score(deck, sup, sub)

    bridge_cond = r["BRIDGE_CONDITION"].strip()
    if bridge_cond not in ("G", "F", "P"):
        bridge_cond = None

    owner_code = r["OWNER_022"].strip().zfill(2)
    owner_name = OWNER_CODES.get(owner_code, f"Owner {owner_code}")

    kind_code = r["STRUCTURE_KIND_043A"].strip()
    structure_kind = STRUCTURE_KIND.get(kind_code, f"Type {kind_code}")

    open_closed = r["OPEN_CLOSED_POSTED_041"].strip()
    status = {"A": "Open", "B": "Posted", "D": "Closed", "E": "Posted", "F": "Posted", "G": "New - Open"}.get(open_closed, open_closed)

    scour = r["SCOUR_CRITICAL_113"].strip()

    inspect_raw = r["DATE_OF_INSPECT_090"].strip()
    inspect_date = None
    if len(inspect_raw) == 6:
        inspect_date = f"20{inspect_raw[4:6]}-{inspect_raw[:2]}" if int(inspect_raw[4:6]) < 50 else f"19{inspect_raw[4:6]}-{inspect_raw[:2]}"

    # Skip records with no usable location
    if lat is None or lng is None:
        continue
    # Sanity-check Michigan bounds
    if not (41.5 <= lat <= 48.5 and -90.5 <= lng <= -82.0):
        continue

    clean_records.append({
        "id": struct_id,
        "year": year,
        "county_code": county_code,
        "county_name": county_name,
        "county_fips": county_fips,
        "district": r["HIGHWAY_DISTRICT_002"].strip(),
        "lat": lat,
        "lng": lng,
        "feature": r["FEATURES_DESC_006A"].strip("'").strip(),
        "facility": r["FACILITY_CARRIED_007"].strip("'").strip(),
        "location": r["LOCATION_009"].strip("'").strip(),
        "year_built": year_built,
        "year_reconstructed": year_recon,
        "age": age,
        "adt": adt,
        "pct_truck": pct_truck,
        "deck_area": deck_area,
        "length_m": length_m,
        "deck_cond": deck,
        "superstructure_cond": sup,
        "substructure_cond": sub,
        "culvert_cond": culvert,
        "lowest_rating": lowest,
        "structural_eval": struct_eval,
        "risk_score": risk_score,
        "bridge_condition": bridge_cond,
        "owner": owner_name,
        "structure_kind": structure_kind,
        "status": status,
        "scour_critical": scour,
        "inspect_date": inspect_date,
    })

print(f"  {len(clean_records):,} records after cleaning (removed missing/invalid coords)")


# ---------------------------------------------------------------------------
# Compute condition_change: LOWEST_RATING delta between earliest and latest year
# ---------------------------------------------------------------------------
print("Computing 5-year condition change per bridge...")

# Group by structure id
bridge_years: dict[str, list[dict]] = defaultdict(list)
for r in clean_records:
    bridge_years[r["id"]].append(r)

# For each bridge, compute change from min-year to max-year
condition_change: dict[str, int | None] = {}
for struct_id, records in bridge_years.items():
    records_sorted = sorted(records, key=lambda x: x["year"])
    first = next((r["lowest_rating"] for r in records_sorted if r["lowest_rating"] is not None), None)
    last = next((r["lowest_rating"] for r in reversed(records_sorted) if r["lowest_rating"] is not None), None)
    if first is not None and last is not None:
        condition_change[struct_id] = last - first  # positive = improved, negative = degraded
    else:
        condition_change[struct_id] = None

for r in clean_records:
    r["condition_change"] = condition_change.get(r["id"])


# ---------------------------------------------------------------------------
# Output 1: bridges_all.json (all years, for temporal charts)
# ---------------------------------------------------------------------------
out_all = DATA_DIR / "data" / "bridges_all.json"
out_all.parent.mkdir(exist_ok=True)

print(f"Writing {out_all.name}...")
with open(out_all, "w", encoding="utf-8") as f:
    json.dump(clean_records, f, separators=(",", ":"))
print(f"  {len(clean_records):,} records -> {out_all.stat().st_size / 1_048_576:.1f} MB")


# ---------------------------------------------------------------------------
# Output 2: bridges_2025.json (2025 snapshot only)
# ---------------------------------------------------------------------------
bridges_2025 = [r for r in clean_records if r["year"] == 2025]

out_2025 = DATA_DIR / "data" / "bridges_2025.json"
print(f"Writing {out_2025.name}...")
with open(out_2025, "w", encoding="utf-8") as f:
    json.dump(bridges_2025, f, separators=(",", ":"))
print(f"  {len(bridges_2025):,} records -> {out_2025.stat().st_size / 1_048_576:.1f} MB")


# ---------------------------------------------------------------------------
# Output 3: county_summary.json (county × year aggregations)
# ---------------------------------------------------------------------------
print("Aggregating county summaries...")

def safe_mean(values):
    vals = [v for v in values if v is not None]
    return round(sum(vals) / len(vals), 2) if vals else None

def count_condition(records, cond):
    return sum(1 for r in records if r["bridge_condition"] == cond)

# Build county × year buckets
county_year: dict[tuple, list] = defaultdict(list)
for r in clean_records:
    county_year[(r["county_code"], r["year"])].append(r)

county_summary = []
for (county_code, year), records in sorted(county_year.items()):
    n = len(records)
    good = count_condition(records, "G")
    fair = count_condition(records, "F")
    poor = count_condition(records, "P")
    unknown = n - good - fair - poor

    avg_risk = safe_mean([r["risk_score"] for r in records])
    avg_age = safe_mean([r["age"] for r in records])
    avg_lowest = safe_mean([r["lowest_rating"] for r in records])
    avg_adt = safe_mean([r["adt"] for r in records])
    pct_poor = round(poor / n * 100, 1) if n > 0 else 0
    pct_good = round(good / n * 100, 1) if n > 0 else 0

    degraded = sum(1 for r in records if r["condition_change"] is not None and r["condition_change"] < 0)
    improved = sum(1 for r in records if r["condition_change"] is not None and r["condition_change"] > 0)

    county_summary.append({
        "county_code": county_code,
        "county_name": MICHIGAN_COUNTIES.get(county_code, f"County {county_code}"),
        "county_fips": f"26{county_code}",
        "year": year,
        "total": n,
        "good": good,
        "fair": fair,
        "poor": poor,
        "unknown": unknown,
        "pct_poor": pct_poor,
        "pct_good": pct_good,
        "avg_risk_score": avg_risk,
        "avg_lowest_rating": avg_lowest,
        "avg_age": avg_age,
        "avg_adt": avg_adt,
        "n_degraded": degraded,
        "n_improved": improved,
    })

out_county = DATA_DIR / "data" / "county_summary.json"
print(f"Writing {out_county.name}...")
with open(out_county, "w", encoding="utf-8") as f:
    json.dump(county_summary, f, separators=(",", ":"), indent=2)
print(f"  {len(county_summary):,} county-year records")


# ---------------------------------------------------------------------------
# Quick sanity summary
# ---------------------------------------------------------------------------
print("\n=== Sanity Check ===")
y2025 = [r for r in clean_records if r["year"] == 2025]
cond_counts = {"G": 0, "F": 0, "P": 0, None: 0}
for r in y2025:
    cond_counts[r["bridge_condition"]] = cond_counts.get(r["bridge_condition"], 0) + 1

print(f"2025 bridges: {len(y2025):,}")
print(f"  Good: {cond_counts.get('G', 0):,}  Fair: {cond_counts.get('F', 0):,}  Poor: {cond_counts.get('P', 0):,}  Unknown: {cond_counts.get(None, 0):,}")

degraded_2025 = [r for r in y2025 if r["condition_change"] is not None and r["condition_change"] < 0]
improved_2025 = [r for r in y2025 if r["condition_change"] is not None and r["condition_change"] > 0]
print(f"  Degraded since 2021: {len(degraded_2025):,}  Improved: {len(improved_2025):,}")

counties_with_data = len({r["county_code"] for r in y2025})
print(f"  Counties with data: {counties_with_data}")
print("\nDone. Output files:")
print(f"  {out_all}")
print(f"  {out_2025}")
print(f"  {out_county}")
