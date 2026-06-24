"""
SASB PDF Report Generator — RT-CH (Chemicals)

Reuses every presentation helper from pdf_report.py (page geometry, paragraph
styles, _std_table, _narrative_table, _render_gri_sections, _build_doc) per
SASB_INTEGRATION_PLAN.md Section 5: the report engine is generic enough to be
reused structurally - only the section content and SASB topic grouping is new.
Called from main.py's /api/reports/generate endpoint when framework='SASB'
and format='pdf'.
"""

import io

from reportlab.platypus import Paragraph, PageBreak

from pdf_report import (
    ST, _build_doc, _render_gri_sections, _filter_plant, _rate,
)

# ── HELPERS (duplicated from main.py to avoid circular import — same
#    convention pdf_report.py already uses for _filter_plant/_rate) ──────────

def _hazardous_waste_breakdown(df):
    haz = df[df["HazardousFlag"] == "Hazardous"]
    nonhaz = df[df["HazardousFlag"] == "Non-hazardous"]
    haz_diverted = float(haz[haz["WasteCategory"] == "Diverted"]["ValueNumber"].sum())
    haz_disposed = float(haz[haz["WasteCategory"] == "Disposed"]["ValueNumber"].sum())
    haz_generated = haz_diverted + haz_disposed
    nonhaz_generated = float(nonhaz["ValueNumber"].sum())
    haz_recycled_pct = round(haz_diverted / haz_generated * 100, 1) if haz_generated > 0 else 0
    return {
        "haz_generated": haz_generated,
        "nonhaz_generated": nonhaz_generated,
        "haz_recycled_pct": haz_recycled_pct,
    }

def _safety_rate_split(df, worker_type=None):
    d = df if worker_type is None else df[df["WorkerType"] == worker_type]
    return _rate(d["RecordableInjuries"].sum(), d["HoursWorked"].sum())

def _fatality_rate(df):
    fatalities = df["FatalitiesInjury"].sum() + df["FatalitiesIllHealth"].sum()
    return _rate(fatalities, df["HoursWorked"].sum())


# ═════════════════════════════════════════════════════════════════════════════
# RT-CH-110 / RT-CH-120 — GHG Emissions & Air Quality
# ═════════════════════════════════════════════════════════════════════════════
def _ghg_air_section(df, year=None, plant=None):
    df = _filter_plant(df, plant)
    years = sorted(int(y) for y in df['ReportingYear'].unique())
    # Air emissions (NOx/SOx/VOC/PM) are only reliable from 2022 onward - the
    # same restriction build_ghg_gri_sections()/_ghg_section() apply to the
    # GRI 305-7 table, with the same documented reason. Scope 1 GHG has no
    # such restriction and still shows the full year range.
    air_years = [y for y in years if y >= 2022]

    def yr_sum(col, yrs=None):
        yrs = yrs or years
        return {y: float(df[df['ReportingYear'] == y][col].sum()) for y in yrs}

    ghg_table = {
        'subtitle': 'RT-CH-110a.1  GHG Emissions',
        'row_header': 'Metric', 'years': years, 'rows': [
            {'label': 'Scope 1 GHG Emissions', 'unit': 'tCO2e', 'values': yr_sum('Scope1TotaltCO2e'), 'is_total': True, 'dp': 1},
        ],
        'notes': [
            'RT-CH-110a.1: Gross global Scope 1 emissions, identical to GRI 305-1. Percentage covered under emissions-limiting regulations is not currently tracked (data gap).',
        ],
    }
    air_table = {
        'subtitle': 'RT-CH-120a.1  Air Quality',
        'row_header': 'Metric', 'years': air_years, 'rows': [
            {'label': 'NOx Emissions',           'unit': 't', 'values': yr_sum('GrossNOxt', air_years), 'is_total': True, 'dp': 2},
            {'label': 'SOx Emissions',           'unit': 't', 'values': yr_sum('GrossSOxt', air_years), 'dp': 2},
            {'label': 'VOC Emissions',           'unit': 't', 'values': yr_sum('GrossVOCt', air_years), 'dp': 2},
            {'label': 'Particulate Matter (PM)', 'unit': 't', 'values': yr_sum('GrossPMt', air_years), 'dp': 2},
        ],
        'notes': [
            'RT-CH-120a.1: Air emissions of NOx, SOx, VOCs, and particulate matter. Hazardous air pollutants (HAPs) are not currently tracked (data gap).',
            'Air emission data available from 2022 onwards, when systematic stack monitoring and air quality measurement was established across all sites. Pre-2022 data is not available and is excluded from this disclosure (same restriction applied to the equivalent GRI 305-7 table).',
        ],
    }
    narrative = {
        'subtitle': 'RT-CH-110a.2  GHG Management Strategy',
        'type': 'narrative', 'row_header': 'Disclosure Element', 'years': [], 'notes': [],
        'rows': [{
            'label': 'Long/short-term GHG strategy & targets',
            'guidance': '[Required — manual input] Describe the long- and short-term strategy to manage Scope 1 emissions, including emissions-reduction targets and performance against those targets.',
        }],
    }
    tables = [ghg_table]
    if air_years:
        tables.append(air_table)
    tables.append(narrative)
    return [{'section_title': 'RT-CH-110 / RT-CH-120 — GHG Emissions & Air Quality', 'tables': tables}]


# ═════════════════════════════════════════════════════════════════════════════
# RT-CH-130 — Energy Management
# ═════════════════════════════════════════════════════════════════════════════
def _energy_mgmt_section(df, year=None, plant=None):
    df = _filter_plant(df, plant)
    years = sorted(int(y) for y in df['ReportingYear'].unique())

    def yr_sum(col):
        return {y: float(df[df['ReportingYear'] == y][col].sum()) for y in years}

    consumed = yr_sum('TotalEnergyConsumedGJ')
    renewable = yr_sum('ElectricityRenewableGJ')
    non_renewable = yr_sum('ElectricityNonRenewableGJ')
    renewable_pct = {
        y: round(renewable[y] / (renewable[y] + non_renewable[y]) * 100, 1) if (renewable[y] + non_renewable[y]) > 0 else 0
        for y in years
    }

    rows = [
        {'label': 'Total Energy Consumed',     'unit': 'GJ', 'values': consumed, 'is_total': True, 'dp': 1},
        {'label': 'Renewable Energy',          'unit': 'GJ', 'values': renewable, 'dp': 1},
        {'label': 'Non-Renewable Energy',      'unit': 'GJ', 'values': non_renewable, 'dp': 1},
        {'label': 'Renewable Energy %',        'unit': '%',  'values': renewable_pct, 'dp': 1},
    ]
    table = {
        'subtitle': 'RT-CH-130a.1  Energy Management',
        'row_header': 'Metric', 'years': years, 'rows': rows,
        'notes': ['Percentage of total energy from grid electricity is not yet broken out separately from renewable/non-renewable electricity (partial — see sasb_requirements.json).'],
    }
    return [{'section_title': 'RT-CH-130 — Energy Management', 'tables': [table]}]


# ═════════════════════════════════════════════════════════════════════════════
# RT-CH-140 — Water Management
# ═════════════════════════════════════════════════════════════════════════════
def _water_mgmt_section(df, year=None, plant=None):
    df = _filter_plant(df, plant)
    years = sorted(int(y) for y in df['ReportingYear'].unique())

    def yr_sum_ml(col):
        # m3 -> megaliters (1 ML = 1,000 m3), matching the GRI 303 report's
        # existing convention so the same metric reads in the same unit
        # whether viewed in the GRI or the SASB report.
        return {y: float(df[df['ReportingYear'] == y][col].sum()) / 1000 for y in years}

    withdrawn = yr_sum_ml('TotalWaterWithdrawn')
    consumed = yr_sum_ml('WaterConsumed')
    stress_raw = {y: float(df[df['ReportingYear'] == y]['TotalWaterWithdrawnStressArea'].sum()) / 1000 for y in years}
    stress_pct = {
        y: round(stress_raw[y] / withdrawn[y] * 100, 1) if withdrawn[y] > 0 else 0
        for y in years
    }

    rows = [
        {'label': 'Total Water Withdrawn',  'unit': 'megaliters', 'values': withdrawn, 'is_total': True, 'dp': 1},
        {'label': 'Total Water Consumed',   'unit': 'megaliters', 'values': consumed, 'dp': 1},
        {'label': '% Withdrawn in Water-Stress Areas', 'unit': '%', 'values': stress_pct, 'dp': 1},
    ]
    table = {
        'subtitle': 'RT-CH-140a.1  Water Management',
        'row_header': 'Metric', 'years': years, 'rows': rows,
        'notes': [
            'Values converted from cubic meters (m3) to megaliters (ML) by dividing by 1,000, matching the GRI 303 report convention.',
            'Water-stress classification is currently self-reported and has not been confirmed to align with the WRI Aqueduct Baseline Water Stress methodology SASB references (status: partial — see sasb_requirements.json).',
            'RT-CH-140a.2 (water permit non-compliance incidents) is not currently tracked (data gap).',
        ],
    }
    return [{'section_title': 'RT-CH-140 — Water Management', 'tables': [table]}]


# ═════════════════════════════════════════════════════════════════════════════
# RT-CH-150 — Hazardous Waste Management
# ═════════════════════════════════════════════════════════════════════════════
def _hazardous_waste_section(df, year=None, plant=None):
    df = _filter_plant(df, plant)
    years = sorted(int(y) for y in df['FiscalReportingPeriod'].unique())

    haz_by_year, nonhaz_by_year, pct_by_year = {}, {}, {}
    for y in years:
        b = _hazardous_waste_breakdown(df[df['FiscalReportingPeriod'] == y])
        haz_by_year[y] = b['haz_generated']
        nonhaz_by_year[y] = b['nonhaz_generated']
        pct_by_year[y] = b['haz_recycled_pct']

    rows = [
        {'label': 'Hazardous Waste Generated',      'unit': 'tonnes', 'values': haz_by_year, 'is_total': True, 'dp': 1},
        {'label': 'Non-Hazardous Waste Generated',  'unit': 'tonnes', 'values': nonhaz_by_year, 'dp': 1},
        {'label': 'Hazardous Waste Recycled %',     'unit': '%',      'values': pct_by_year, 'dp': 1},
    ]
    table = {
        'subtitle': 'RT-CH-150a.1  Hazardous Waste Management',
        'row_header': 'Metric', 'years': years, 'rows': rows,
        'notes': ['Hazardous/Non-hazardous split reuses the HazardousFlag column already present in the GRI 306 waste dataset (the same column GRI 306-4/306-5 hazardous-split tables already use).'],
    }
    return [{'section_title': 'RT-CH-150 — Hazardous Waste Management', 'tables': [table]}]


# ═════════════════════════════════════════════════════════════════════════════
# RT-CH-320 — Workforce Health & Safety
# ═════════════════════════════════════════════════════════════════════════════
def _workforce_safety_section(df, year=None, plant=None):
    df = _filter_plant(df, plant)
    years = sorted(int(y) for y in df['FiscalReportingPeriod'].unique())

    trir_total, trir_emp, trir_con, fat_rate = {}, {}, {}, {}
    for y in years:
        sub = df[df['FiscalReportingPeriod'] == y]
        trir_total[y] = _safety_rate_split(sub)
        trir_emp[y] = _safety_rate_split(sub, 'Employee')
        trir_con[y] = _safety_rate_split(sub, 'Contractor')
        fat_rate[y] = _fatality_rate(sub)

    rows = [
        {'label': 'TRIR (All Workers)',  'unit': 'per 200k hrs', 'values': trir_total, 'is_total': True, 'dp': 2},
        {'label': 'TRIR (Employees)',    'unit': 'per 200k hrs', 'values': trir_emp, 'dp': 2},
        {'label': 'TRIR (Contractors)',  'unit': 'per 200k hrs', 'values': trir_con, 'dp': 2},
        {'label': 'Fatality Rate',       'unit': 'per 200k hrs', 'values': fat_rate, 'dp': 2},
    ]
    table = {
        'subtitle': 'RT-CH-320a.1  Workforce Health & Safety',
        'row_header': 'Metric', 'years': years, 'rows': rows,
        'notes': [
            'Employee/Contractor split reuses the WorkerType column already present in the GRI 403 dataset.',
            'Near Miss Frequency Rate (NMFR) is not currently tracked (data gap — no near-miss column exists).',
        ],
    }
    return [{'section_title': 'RT-CH-320 — Workforce Health & Safety', 'tables': [table]}]


# ═════════════════════════════════════════════════════════════════════════════
# RT-CH-540 — Process Safety (placeholder — no source dataset exists today)
# ═════════════════════════════════════════════════════════════════════════════
def _process_safety_section():
    table = {
        'subtitle': 'RT-CH-540a.1 / RT-CH-540a.2  Operational Safety, Emergency Preparedness & Response',
        'type': 'narrative', 'row_header': 'Disclosure Element', 'years': [], 'notes': [],
        'rows': [
            {'label': 'Process Safety Incidents Count (PSIC)', 'guidance': '[Data gap — no source] Requires a dedicated process-safety incident dataset (loss of containment, fire/explosion events), distinct from the occupational-safety dataset (GRI 403) used elsewhere in this dashboard. See SASB_INTEGRATION_PLAN.md Section 4/9.'},
            {'label': 'Process Safety Total Incident Rate (PSTIR)', 'guidance': '[Data gap — no source] Formula would reuse the existing rate_per_basis() convention once incident-count and covered-facility hours data exists.'},
            {'label': 'Process Safety Incident Severity Rate (PSISR)', 'guidance': '[Data gap — no source] Same dependency as PSTIR, plus a severity classification per incident.'},
        ],
    }
    return [{'section_title': 'RT-CH-540 — Process Safety', 'tables': [table]}]


# ═════════════════════════════════════════════════════════════════════════════
# MAIN ENTRY POINT
# ═════════════════════════════════════════════════════════════════════════════
def generate_sasb_pdf(templates, year=None, plant=None,
                       load_water_fn=None, load_waste_fn=None,
                       load_safety_fn=None, load_energy_fn=None,
                       load_ghg_fn=None):
    buf = io.BytesIO()
    doc = _build_doc(buf, org_label='ESG Dashboard  ·  SASB RT-CH Disclosure Index 2025')
    story = []
    first = True

    ORDER = ['sasb_ghg_air', 'sasb_energy', 'sasb_water', 'sasb_waste', 'sasb_safety', 'sasb_process_safety']
    for tpl in ORDER:
        if tpl not in templates:
            continue
        if not first:
            story.append(PageBreak())
        first = False

        if tpl == 'sasb_ghg_air' and load_ghg_fn:
            story += _render_gri_sections(_ghg_air_section(load_ghg_fn(), year=year, plant=plant))
        elif tpl == 'sasb_energy' and load_energy_fn:
            story += _render_gri_sections(_energy_mgmt_section(load_energy_fn(), year=year, plant=plant))
        elif tpl == 'sasb_water' and load_water_fn:
            story += _render_gri_sections(_water_mgmt_section(load_water_fn(), year=year, plant=plant))
        elif tpl == 'sasb_waste' and load_waste_fn:
            story += _render_gri_sections(_hazardous_waste_section(load_waste_fn(), year=year, plant=plant))
        elif tpl == 'sasb_safety' and load_safety_fn:
            story += _render_gri_sections(_workforce_safety_section(load_safety_fn(), year=year, plant=plant))
        elif tpl == 'sasb_process_safety':
            story += _render_gri_sections(_process_safety_section())

    if not story:
        story = [Paragraph('No data available for the selected templates.', ST['nt'])]

    doc.build(story)
    buf.seek(0)
    return buf
