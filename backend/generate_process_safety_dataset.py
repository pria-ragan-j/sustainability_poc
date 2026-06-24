"""
Process Safety Synthetic Dataset Generator — SASB RT-CH-540a
Run once from the backend/ directory:  python generate_process_safety_dataset.py
Creates 1 Excel file in ../data/ matching the GRI dataset conventions
(same 5 plants, same monthly grain 2019-01 through 2025-12, header=1 read
convention). No real incident data was collected — every value below is
synthetic/generated for demo purposes, consistent with the rest of this
project's datasets.
"""
import os
import random
import pandas as pd
import numpy as np

random.seed(42)
np.random.seed(42)

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
os.makedirs(DATA_DIR, exist_ok=True)

PLANTS = [
    {"PlantId": 101, "PlantName": "Plant 1", "Region": "West"},
    {"PlantId": 102, "PlantName": "Plant 2", "Region": "East"},
    {"PlantId": 103, "PlantName": "Plant 3", "Region": "South"},
    {"PlantId": 104, "PlantName": "Plant 4", "Region": "North"},
    {"PlantId": 105, "PlantName": "Plant 5", "Region": "West"},
]

HEADCOUNT_BASE_2019 = {"Plant 1": 580, "Plant 2": 728, "Plant 3": 609, "Plant 4": 496, "Plant 5": 417}
HEADCOUNT_GROWTH = 0.018  # ~1.8% per year, applied per month fraction

MONTHS = pd.date_range("2019-01-01", "2025-12-01", freq="MS")


def generate_process_safety_dataset():
    rows = []
    for plant in PLANTS:
        pn = plant["PlantName"]
        base_headcount = HEADCOUNT_BASE_2019[pn]
        # Older/larger plants run a slightly higher base incident rate
        plant_risk = {"Plant 1": 1.0, "Plant 2": 1.15, "Plant 3": 0.9, "Plant 4": 0.8, "Plant 5": 0.75}[pn]

        for month in MONTHS:
            year_idx = (month.year - 2019) + month.month / 12
            headcount = round(base_headcount * (1 + HEADCOUNT_GROWTH) ** year_idx)
            hours_worked = round(headcount * 173.3)  # ~173.3 hrs/employee/month (2080/12)

            # Safety performance improves slowly over time (process safety
            # management maturity curve) - incident rates trend down ~4%/yr.
            improvement = 0.96 ** year_idx

            tier1_lambda = 0.025 * plant_risk * improvement
            tier2_lambda = 0.12 * plant_risk * improvement

            tier1 = np.random.poisson(tier1_lambda)
            tier2 = np.random.poisson(tier2_lambda)

            # CCPS-style severity weighting: Tier 1 (significant LOPC) weighs
            # far more than Tier 2 (lesser LOPC) toward the severity rate.
            severity_score = round(tier1 * 10 + tier2 * 3, 1)

            investigations_completed = tier1 + tier2 if (tier1 + tier2) == 0 else int(tier1 + tier2)
            corrective_actions_completed = investigations_completed + (1 if investigations_completed and random.random() < 0.6 else 0)

            rows.append({
                "ReportingPeriod": month,
                "ReportingYear": month.year,
                "ReportingMonthNum": month.month,
                "FiscalReportingPeriod": month.year,
                "PlantId": plant["PlantId"],
                "PlantName": pn,
                "Region": plant["Region"],
                "HoursWorked": hours_worked,
                "Tier1Incidents": int(tier1),
                "Tier2Incidents": int(tier2),
                "SeverityScore": severity_score,
                "InvestigationsCompleted": investigations_completed,
                "CorrectiveActionsCompleted": corrective_actions_completed,
            })

    df = pd.DataFrame(rows)

    path = os.path.join(DATA_DIR, "GRI_RTCH540a_ProcessSafety_Dataset_2019_2025.xlsx")
    with pd.ExcelWriter(path, engine="openpyxl") as writer:
        # Same convention as the other GRI/BRSR datasets: title in row 0,
        # column headers in row 1 (_load_sheet in main.py reads header=1).
        df.to_excel(writer, sheet_name="Raw_Monthly_Data", index=False, startrow=1)
        ws = writer.sheets["Raw_Monthly_Data"]
        ws.cell(1, 1, "Process Safety Dataset (SASB RT-CH-540a) — Synthetic Data, 2019-2025")
    print(f"  Created: {path}  ({len(df)} rows)")
    return df


if __name__ == "__main__":
    print("Generating Process Safety synthetic dataset (SASB RT-CH-540a)...")
    generate_process_safety_dataset()
    print("Done.")
