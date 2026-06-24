"""
GRI PDF Report Generator — Birla Carbon style (landscape A4, navy headers, split tables)
Uses ReportLab which is already installed (reportlab 4.x).
Called from main.py's /api/reports/generate endpoint when format='pdf'.
"""

import io
import numpy as np

from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.platypus import (
    BaseDocTemplate, Frame, PageTemplate,
    Table, TableStyle, Paragraph, Spacer, PageBreak,
)

# ── PAGE GEOMETRY ─────────────────────────────────────────────────────────────
PAGE_W, PAGE_H = landscape(A4)      # 841.89 × 595.28 pt
MARGIN_LR  = 1.5 * cm
MARGIN_TOP = 2.0 * cm
MARGIN_BOT = 1.5 * cm
AVAIL_W    = PAGE_W - 2 * MARGIN_LR   # ≈ 756.85 pt

# ── PALETTE ───────────────────────────────────────────────────────────────────
NAVY      = colors.HexColor('#1B3A6B')
WHITE     = colors.white
NOTE_COL  = colors.HexColor('#555555')
BORDER    = colors.HexColor('#CCCCCC')
TOTAL_BG  = colors.HexColor('#EDF2F7')
HDR_TEXT  = colors.HexColor('#777777')

# ── PARAGRAPH STYLES ─────────────────────────────────────────────────────────
def _make_styles():
    b = ParagraphStyle('_b', fontName='Helvetica', fontSize=8.5, leading=11)
    def s(name, **kw):
        return ParagraphStyle(name, parent=b, **kw)
    return {
        'sec':    s('sec',   fontName='Helvetica-Bold',        fontSize=10,  textColor=WHITE,         leading=13),
        'sub':    s('sub',   fontName='Helvetica-BoldOblique', fontSize=9,   textColor=NAVY,          leading=12),
        'th':     s('th',    fontName='Helvetica-Bold',        fontSize=8,   textColor=colors.black,  alignment=TA_CENTER),
        'th_l':   s('th_l',  fontName='Helvetica-Bold',        fontSize=8,   textColor=colors.black,  alignment=TA_LEFT),
        'td':     s('td',    fontName='Helvetica',             fontSize=8,   textColor=colors.black,  alignment=TA_RIGHT),
        'td_l':   s('td_l',  fontName='Helvetica',             fontSize=8,   textColor=colors.black,  alignment=TA_LEFT),
        'td_b':   s('td_b',  fontName='Helvetica-Bold',        fontSize=8,   textColor=colors.black,  alignment=TA_RIGHT),
        'td_bl':  s('td_bl', fontName='Helvetica-Bold',        fontSize=8,   textColor=colors.black,  alignment=TA_LEFT),
        'td7':    s('td7',   fontName='Helvetica',             fontSize=7,   textColor=colors.black,  alignment=TA_RIGHT),
        'td7l':   s('td7l',  fontName='Helvetica',             fontSize=7,   textColor=colors.black,  alignment=TA_LEFT),
        'td7b':   s('td7b',  fontName='Helvetica-Bold',        fontSize=7,   textColor=colors.black,  alignment=TA_RIGHT),
        'td7bl':  s('td7bl', fontName='Helvetica-Bold',        fontSize=7,   textColor=colors.black,  alignment=TA_LEFT),
        'th7':    s('th7',   fontName='Helvetica-Bold',        fontSize=7,   textColor=colors.black,  alignment=TA_CENTER),
        'nl':     s('nl',    fontName='Helvetica-BoldOblique', fontSize=7.5, textColor=NOTE_COL),
        'nt':     s('nt',    fontName='Helvetica-Oblique',     fontSize=7.5, textColor=NOTE_COL),
    }

ST = _make_styles()

# ── NUMBER FORMAT ─────────────────────────────────────────────────────────────
def _n(v, dp=0, na='0'):
    if v is None:
        return na
    try:
        fv = float(v)
        if np.isnan(fv) or np.isinf(fv):
            return na
        if dp == 0:
            return f'{round(fv):,}'
        return f'{fv:,.{dp}f}'
    except Exception:
        return str(v)

# ── HELPERS (duplicated from main.py to avoid circular import) ────────────────
def _filter_plant(df, plant, col='PlantName'):
    if plant and plant.lower() not in ('all', 'all plants') and plant in df[col].unique():
        return df[df[col] == plant]
    return df

def _rate(count, hours, basis=200000):
    return round(float(count) / float(hours) * basis, 2) if hours else 0

# ── PAGE TEMPLATE ─────────────────────────────────────────────────────────────
_ORG = 'ESG Dashboard  ·  GRI Disclosure Index 2025'

def _on_page_factory(org_label):
    def _on_page(canv, doc):
        canv.saveState()
        canv.setFont('Helvetica', 7.5)
        canv.setFillColor(HDR_TEXT)
        canv.drawString(MARGIN_LR, PAGE_H - MARGIN_TOP * 0.6, org_label)
        canv.drawRightString(PAGE_W - MARGIN_LR, PAGE_H - MARGIN_TOP * 0.6, str(doc.page))
        canv.restoreState()
    return _on_page

def _build_doc(buf, org_label=_ORG):
    doc = BaseDocTemplate(
        buf, pagesize=landscape(A4),
        leftMargin=MARGIN_LR, rightMargin=MARGIN_LR,
        topMargin=MARGIN_TOP, bottomMargin=MARGIN_BOT,
    )
    frame = Frame(MARGIN_LR, MARGIN_BOT, AVAIL_W,
                  PAGE_H - MARGIN_TOP - MARGIN_BOT, id='main')
    doc.addPageTemplates([PageTemplate('all', frames=[frame], onPage=_on_page_factory(org_label))])
    return doc

# ── SHARED BUILDING BLOCKS ────────────────────────────────────────────────────
def _sec_hdr(title):
    t = Table([[Paragraph(title, ST['sec'])]], colWidths=[AVAIL_W])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), NAVY),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ]))
    return t

def _sub(text):
    return Paragraph(text, ST['sub'])

def _gap(h=8):
    return Spacer(1, h)

def _notes(notes):
    if not notes:
        return []
    out = [_gap(4), Paragraph('Notes:', ST['nl'])]
    for n in notes:
        out.append(Paragraph(n, ST['nt']))
    return out

_BASE_TS = [
    ('GRID',         (0, 0), (-1, -1), 0.3, BORDER),
    ('TOPPADDING',   (0, 0), (-1, -1), 3),
    ('BOTTOMPADDING',(0, 0), (-1, -1), 3),
    ('LEFTPADDING',  (0, 0), (-1, -1), 5),
    ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ('VALIGN',       (0, 0), (-1, -1), 'MIDDLE'),
    ('LINEBELOW',    (0, 0), (-1, 0),  0.5, BORDER),
]

# ── STANDARD YEARLY TABLE ─────────────────────────────────────────────────────
# rows_data items: {'label', 'unit', 'values': {year: num}, 'is_total': bool, 'dp': int}
def _std_table(rows_data, years, row_hdr='Source', w_label=185, w_unit=75, default_dp=0):
    n = len(years)
    w_yr = (AVAIL_W - w_label - w_unit) / n
    cols = [w_label, w_unit] + [w_yr] * n

    hdr = [Paragraph(row_hdr, ST['th_l']), Paragraph('Units', ST['th'])] + \
          [Paragraph(str(y), ST['th']) for y in years]
    tbl_rows = [hdr]
    ts = list(_BASE_TS)

    for i, r in enumerate(rows_data, 1):
        tot = r.get('is_total', False)
        dp  = r.get('dp', default_dp)
        sl  = ST['td_bl'] if tot else ST['td_l']
        sr  = ST['td_b']  if tot else ST['td']
        cells = [Paragraph(r['label'], sl), Paragraph(r.get('unit', ''), sr)] + \
                [Paragraph(_n(r['values'].get(y), dp), sr) for y in years]
        tbl_rows.append(cells)
        if tot:
            ts.append(('BACKGROUND', (0, i), (-1, i), TOTAL_BG))

    t = Table(tbl_rows, colWidths=cols, repeatRows=1)
    t.setStyle(TableStyle(ts))
    return t

# ── SPLIT YEARLY TABLE (Haz / Non-haz columns) ───────────────────────────────
# rows_data items: {'label', 'haz': {yr: num}, 'nonhaz': {yr: num}, 'is_total': bool}
def _split_table(rows_data, years):
    n = len(years)
    w_cat  = 130
    w_unit = 52
    w_each = (AVAIL_W - w_cat - w_unit) / (n * 2)
    cols   = [w_cat, w_unit] + [w_each, w_each] * n

    # Level-1 header: year spans 2 sub-cols
    L1 = [Paragraph('Category', ST['th7']), Paragraph('Units', ST['th7'])] + \
         sum([[Paragraph(str(y), ST['th7']), ''] for y in years], [])
    # Level-2 header: Haz / Non-haz
    L2 = ['', ''] + [Paragraph('Haz.', ST['th7']), Paragraph('Non-haz.', ST['th7'])] * n

    tbl_rows = [L1, L2]
    ts = [
        ('GRID',         (0, 0), (-1, -1), 0.3, BORDER),
        ('TOPPADDING',   (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING',(0, 0), (-1, -1), 3),
        ('LEFTPADDING',  (0, 0), (-1, -1), 3),
        ('RIGHTPADDING', (0, 0), (-1, -1), 3),
        ('VALIGN',       (0, 0), (-1, -1), 'MIDDLE'),
        ('LINEBELOW',    (0, 1), (-1, 1),  0.5, BORDER),
    ]
    for i in range(n):
        c = 2 + i * 2
        ts.append(('SPAN', (c, 0), (c + 1, 0)))

    for i, r in enumerate(rows_data, 2):
        tot = r.get('is_total', False)
        sl  = ST['td7bl'] if tot else ST['td7l']
        sr  = ST['td7b']  if tot else ST['td7']
        cells = [Paragraph(r['label'], sl), Paragraph('tonnes', sr)]
        for y in years:
            cells.append(Paragraph(_n(r['haz'].get(y, 0)), sr))
            cells.append(Paragraph(_n(r['nonhaz'].get(y, 0)), sr))
        tbl_rows.append(cells)
        if tot:
            ts.append(('BACKGROUND', (0, i), (-1, i), TOTAL_BG))

    t = Table(tbl_rows, colWidths=cols, repeatRows=2)
    t.setStyle(TableStyle(ts))
    return t

# ── NARRATIVE TABLE (Management Approach — two text columns) ──────────────────
# rows: list of {'label': str, 'guidance': str}
GUIDANCE_COL  = colors.HexColor('#F7F9FC')
GUIDANCE_TEXT = colors.HexColor('#333333')

def _narrative_table(rows_data, row_hdr='Disclosure Element'):
    w_label   = AVAIL_W * 0.28
    w_guidance = AVAIL_W - w_label
    cols = [w_label, w_guidance]

    td_nar = ParagraphStyle('td_nar', parent=ST['td_l'],
                             fontName='Helvetica-Oblique', fontSize=7.5,
                             textColor=GUIDANCE_TEXT, leading=10)

    hdr = [Paragraph(row_hdr, ST['th_l']),
           Paragraph('Required Content / Placeholder', ST['th_l'])]
    tbl_rows = [hdr]
    ts = list(_BASE_TS) + [('BACKGROUND', (1, 1), (1, -1), GUIDANCE_COL)]

    for i, r in enumerate(rows_data, 1):
        tbl_rows.append([
            Paragraph(r['label'], ST['td_l']),
            Paragraph(r.get('guidance', ''), td_nar),
        ])
        if i % 2 == 0:
            ts.append(('ROWBACKGROUNDS', (0, i), (0, i), [colors.HexColor('#F0F4F8')]))

    t = Table(tbl_rows, colWidths=cols, repeatRows=1)
    t.setStyle(TableStyle(ts))
    return t


# ── GENERIC GRI SECTIONS RENDERER (handles both "narrative" and standard types) ──
def _render_gri_sections(gri_sections):
    """Render any list of sections built by build_*_gri_sections()."""
    items = []
    for section in gri_sections:
        for t_idx, table in enumerate(section['tables']):
            if t_idx == 0:
                items.append(_sec_hdr(section['section_title']))
                items.append(_gap())
            items.append(_sub(table['subtitle']))
            items.append(_gap(4))

            if table.get('type') == 'narrative':
                items.append(_narrative_table(
                    table['rows'],
                    row_hdr=table.get('row_header', 'Disclosure Element'),
                ))
            else:
                years = [int(y) for y in table['years']]
                rows_data = [{
                    'label':    r['label'],
                    'unit':     r.get('unit', table.get('unit', '')),
                    'values':   {int(y): (None if r['values'].get(y) == 'N/A' else r['values'].get(y)) for y in years},
                    'is_total': r.get('is_total', False),
                    'dp':       r.get('dp', 1),
                } for r in table['rows']]
                items.append(_std_table(
                    rows_data, years,
                    row_hdr=table.get('row_header', 'Source'),
                    w_unit=85,
                ))

            items += _notes(table.get('notes', []))
            items.append(_gap())
    return items


# ═════════════════════════════════════════════════════════════════════════════
# GRI 302 — ENERGY  (routed through build_energy_gri_sections() — same pattern
# Water already used, so PDF picks up the management-approach narratives and
# the GRI-correct weighted-ratio Energy Intensity/Renewable % that the old
# duplicate df-based implementation here was missing/getting wrong)
# ═════════════════════════════════════════════════════════════════════════════
def _energy_section(gri_sections):
    return _render_gri_sections(gri_sections)

# ═════════════════════════════════════════════════════════════════════════════
# GRI 303 — WATER  (uses pre-built sections from build_water_gri_sections())
# ═════════════════════════════════════════════════════════════════════════════
def _water_section(gri_sections):
    return _render_gri_sections(gri_sections)

# ═════════════════════════════════════════════════════════════════════════════
# GRI 305 — GHG EMISSIONS  (routed through build_ghg_gri_sections() — same
# reasoning as Energy above; also fixes the GRI 305-7 air-years restriction
# and weighted Scope 1/2/3 intensity automatically since the main.py builder
# already implements both correctly)
# ═════════════════════════════════════════════════════════════════════════════
def _ghg_section(gri_sections):
    return _render_gri_sections(gri_sections)

# ═════════════════════════════════════════════════════════════════════════════
# GRI 306 — WASTE  (keeps its own split Haz/Non-haz table rendering - denser
# and clearer than the flat-row rendering _render_gri_sections() would use -
# but now also renders the management-approach narrative (306-1/306-2) that
# build_waste_gri_sections() already builds, sourced from gri_sections so the
# narrative text has a single source of truth shared with CSV/Excel output)
# ═════════════════════════════════════════════════════════════════════════════
def _waste_section(df, gri_sections, year=None, plant=None):
    df = _filter_plant(df, plant)
    years = sorted(int(y) for y in df['FiscalReportingPeriod'].unique())

    def pivot_haz(category, indicator=None):
        mask = df['WasteCategory'] == category
        if indicator:
            mask &= df['IndicatorName'] == indicator
        sub = df[mask]
        return {
            'haz':    {y: float(sub[(sub['FiscalReportingPeriod'] == y) & (sub['HazardousFlag'] == 'Hazardous')   ]['ValueNumber'].sum()) for y in years},
            'nonhaz': {y: float(sub[(sub['FiscalReportingPeriod'] == y) & (sub['HazardousFlag'] == 'Non-hazardous')]['ValueNumber'].sum()) for y in years},
        }

    def yrsum(category):
        sub = df[df['WasteCategory'] == category]
        return {y: float(sub[sub['FiscalReportingPeriod'] == y]['ValueNumber'].sum()) for y in years}

    # 306-3
    div_tot = yrsum('Diverted')
    dis_tot = yrsum('Disposed')
    gen_tot = {y: div_tot[y] + dis_tot[y] for y in years}

    ph = pivot_haz('Diverted'); pnh = pivot_haz('Disposed')
    gen_haz    = {y: ph['haz'][y]    + pnh['haz'][y]    for y in years}
    gen_nonhaz = {y: ph['nonhaz'][y] + pnh['nonhaz'][y] for y in years}

    gen_rows = [
        {'label': 'Total Waste Generated', 'unit': 'tonnes', 'values': gen_tot,    'is_total': True},
        {'label': 'Hazardous Waste',        'unit': 'tonnes', 'values': gen_haz},
        {'label': 'Non-hazardous Waste',    'unit': 'tonnes', 'values': gen_nonhaz},
    ]

    # 306-4 diverted split
    div_reuse   = pivot_haz('Diverted', 'Reuse')
    div_recycle = pivot_haz('Diverted', 'Recycling')
    div_other   = pivot_haz('Diverted', 'Other')
    div_all     = pivot_haz('Diverted')
    diverted_rows = [
        {'label': 'Reuse',     **div_reuse},
        {'label': 'Recycling', **div_recycle},
        {'label': 'Other',     **div_other},
        {'label': 'Total',     **div_all, 'is_total': True},
    ]

    # 306-5 disposed split
    dis_incin  = pivot_haz('Disposed', 'Incineration')
    dis_incin_r= pivot_haz('Disposed', 'Incineration (with recovery)')
    dis_landf  = pivot_haz('Disposed', 'Landfill')
    dis_all    = pivot_haz('Disposed')
    disposed_rows = [
        {'label': 'Incineration',                  **dis_incin},
        {'label': 'Incineration (with recovery)',   **dis_incin_r},
        {'label': 'Landfill',                       **dis_landf},
        {'label': 'Total',                          **dis_all, 'is_total': True},
    ]

    # Management-approach narrative (306-1/306-2), sourced from
    # build_waste_gri_sections()'s first section so the text matches CSV/Excel.
    items = []
    ma_section = gri_sections[0]
    items.append(_sec_hdr(ma_section['section_title']))
    items.append(_gap())
    for table in ma_section['tables']:
        items.append(_sub(table['subtitle']))
        items.append(_gap(4))
        items.append(_narrative_table(table['rows'], row_hdr=table.get('row_header', 'Disclosure Element')))
        items += _notes(table.get('notes', []))
        items.append(_gap())

    items.append(_sec_hdr('GRI 306-3  Waste Generated'))
    items.append(_gap())
    items.append(_std_table(gen_rows, years, row_hdr='Category', w_label=200))
    items += _notes(['The waste disposal method is determined by the organization except for landfill disposal which defaults to the waste contractor.'])
    items.append(_gap())
    items.append(_sec_hdr('GRI 306-4  Waste Diverted From Disposal'))
    items.append(_gap())
    items.append(_split_table(diverted_rows, years))
    items += _notes(['Values split by Hazardous / Non-hazardous classification per GRI 306-4.'])
    items.append(_gap())
    items.append(_sec_hdr('GRI 306-5  Waste Directed to Disposal'))
    items.append(_gap())
    items.append(_split_table(disposed_rows, years))
    items += _notes(['Values split by Hazardous / Non-hazardous classification per GRI 306-5.'])
    return items

# ═════════════════════════════════════════════════════════════════════════════
# GRI 403 — OHS  (routed through build_safety_gri_sections() — same pattern
# as Energy/GHG above. This adds the 403-1..403-7 management-approach
# narrative and switches from "latest year only" to the full multi-year
# trend every other GRI section already shows. Trade-off: the auto-derived
# "main type of injury" text the old per-year dual-table format showed is
# not part of build_safety_gri_sections()'s output - that detail is still
# visible on the live Safety dashboard's injury-type chart.)
# ═════════════════════════════════════════════════════════════════════════════
def _ohs_section(gri_sections):
    return _render_gri_sections(gri_sections)

# ═════════════════════════════════════════════════════════════════════════════
# MAIN ENTRY POINT
# ═════════════════════════════════════════════════════════════════════════════
def generate_gri_pdf(templates, year=None, plant=None,
                     load_water_fn=None, load_waste_fn=None,
                     load_safety_fn=None, load_energy_fn=None,
                     load_ghg_fn=None, build_water_sections_fn=None,
                     build_energy_sections_fn=None, build_ghg_sections_fn=None,
                     build_waste_sections_fn=None, build_safety_sections_fn=None):
    buf = io.BytesIO()
    doc = _build_doc(buf)
    story = []
    first = True

    ORDER = ['gri_302', 'gri_303', 'gri_305', 'gri_306', 'gri_403']
    for tpl in ORDER:
        if tpl not in templates:
            continue
        if not first:
            story.append(PageBreak())
        first = False

        if tpl == 'gri_302' and load_energy_fn and build_energy_sections_fn:
            secs = build_energy_sections_fn(load_energy_fn(), year=year, plant=plant)
            story += _energy_section(secs)
        elif tpl == 'gri_303' and load_water_fn and build_water_sections_fn:
            df = load_water_fn()
            secs = build_water_sections_fn(df, year=year, plant=plant)
            story += _water_section(secs)
        elif tpl == 'gri_305' and load_ghg_fn and build_ghg_sections_fn:
            secs = build_ghg_sections_fn(load_ghg_fn(), year=year, plant=plant)
            story += _ghg_section(secs)
        elif tpl == 'gri_306' and load_waste_fn and build_waste_sections_fn:
            df = load_waste_fn()
            secs = build_waste_sections_fn(df, year=year, plant=plant)
            story += _waste_section(df, secs, year=year, plant=plant)
        elif tpl == 'gri_403' and load_safety_fn and build_safety_sections_fn:
            secs = build_safety_sections_fn(load_safety_fn(), year=year, plant=plant)
            story += _ohs_section(secs)

    if not story:
        story = [Paragraph('No data available for the selected templates.', ST['nt'])]

    doc.build(story)
    buf.seek(0)
    return buf
