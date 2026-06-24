"""
BRSR Synthetic Dataset Generator
Run once from the backend/ directory:  python generate_brsr_datasets.py
Creates 3 Excel files in ../data/ matching the GRI dataset conventions
(same 5 plants, same PlantId 101-105, FY2019-20 through FY2024-25).
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
    {"PlantId": 101, "PlantName": "Plant 1", "Region": "West",  "StateProvince": "Maharashtra", "City": "Mumbai",   "Country": "India"},
    {"PlantId": 102, "PlantName": "Plant 2", "Region": "East",  "StateProvince": "West Bengal",  "City": "Kolkata",  "Country": "India"},
    {"PlantId": 103, "PlantName": "Plant 3", "Region": "South", "StateProvince": "Tamil Nadu",   "City": "Chennai",  "Country": "India"},
    {"PlantId": 104, "PlantName": "Plant 4", "Region": "North", "StateProvince": "Delhi",         "City": "New Delhi","Country": "India"},
    {"PlantId": 105, "PlantName": "Plant 5", "Region": "West",  "StateProvince": "Gujarat",       "City": "Surat",    "Country": "India"},
]

FY_PERIODS = [
    ("FY2019-20", 2019), ("FY2020-21", 2020), ("FY2021-22", 2021),
    ("FY2022-23", 2022), ("FY2023-24", 2023), ("FY2024-25", 2024),
]

# Derived from GRI403 dataset (exact values read during analysis phase)
# Keys: (plant_name, fy_start_year) → (employee_avg, contractor_avg)
HEADCOUNT_BASE = {
    ("Plant 1", 2019): (430, 150), ("Plant 1", 2020): (439, 153), ("Plant 1", 2021): (448, 156),
    ("Plant 1", 2022): (457, 160), ("Plant 1", 2023): (466, 166), ("Plant 1", 2024): (478, 175),
    ("Plant 2", 2019): (538, 190), ("Plant 2", 2020): (549, 194), ("Plant 2", 2021): (561, 198),
    ("Plant 2", 2022): (573, 202), ("Plant 2", 2023): (586, 210), ("Plant 2", 2024): (598, 222),
    ("Plant 3", 2019): (473, 136), ("Plant 3", 2020): (483, 139), ("Plant 3", 2021): (493, 142),
    ("Plant 3", 2022): (503, 145), ("Plant 3", 2023): (514, 150), ("Plant 3", 2024): (526, 159),
    ("Plant 4", 2019): (387, 109), ("Plant 4", 2020): (395, 111), ("Plant 4", 2021): (403, 114),
    ("Plant 4", 2022): (411, 117), ("Plant 4", 2023): (420, 121), ("Plant 4", 2024): (430, 127),
    ("Plant 5", 2019): (322,  95), ("Plant 5", 2020): (329,  97), ("Plant 5", 2021): (336,  99),
    ("Plant 5", 2022): (343, 102), ("Plant 5", 2023): (350, 106), ("Plant 5", 2024): (358, 111),
}

# Safety training hours per plant per FY (summed from GRI403 TrainingHoursSafety annual totals)
SAFETY_TRAINING_HOURS = {
    ("Plant 1", 2019): 4200, ("Plant 1", 2020): 3800, ("Plant 1", 2021): 4100,
    ("Plant 1", 2022): 4500, ("Plant 1", 2023): 4800, ("Plant 1", 2024): 5200,
    ("Plant 2", 2019): 5100, ("Plant 2", 2020): 4600, ("Plant 2", 2021): 5000,
    ("Plant 2", 2022): 5500, ("Plant 2", 2023): 5800, ("Plant 2", 2024): 6042,
    ("Plant 3", 2019): 4400, ("Plant 3", 2020): 3900, ("Plant 3", 2021): 4300,
    ("Plant 3", 2022): 4700, ("Plant 3", 2023): 5000, ("Plant 3", 2024): 5400,
    ("Plant 4", 2019): 3500, ("Plant 4", 2020): 3181, ("Plant 4", 2021): 3400,
    ("Plant 4", 2022): 3700, ("Plant 4", 2023): 4000, ("Plant 4", 2024): 4300,
    ("Plant 5", 2019): 3000, ("Plant 5", 2020): 2800, ("Plant 5", 2021): 3100,
    ("Plant 5", 2022): 3400, ("Plant 5", 2023): 3700, ("Plant 5", 2024): 4000,
}

# Wage base (Plant 1 = highest base; others are scaled % of Plant 1)
WAGE_SCALE = {
    "Plant 1": 1.00, "Plant 2": 0.97, "Plant 3": 0.95, "Plant 4": 0.93, "Plant 5": 0.90
}


def _round(x):
    return int(round(x))


def generate_workforce_dataset():
    rows = []
    for plant in PLANTS:
        pn = plant["PlantName"]
        for fy, start_year in FY_PERIODS:
            fy_idx = start_year - 2019  # 0-5

            emp_total, cont_total = HEADCOUNT_BASE[(pn, start_year)]

            # Gender split — female % grows 0.5 pp/year from 14% base
            female_pct_perm = 0.14 + fy_idx * 0.005
            other_pct_perm  = 0.008  # constant ~0.8%
            male_pct_perm   = 1 - female_pct_perm - other_pct_perm

            perm_female = _round(emp_total * female_pct_perm)
            perm_other  = max(1, _round(emp_total * other_pct_perm))
            perm_male   = emp_total - perm_female - perm_other

            # Contractual gender split
            cont_female_pct = 0.10 + fy_idx * 0.003
            cont_other_pct  = 0.005
            cont_female = _round(cont_total * cont_female_pct)
            cont_other  = max(0, _round(cont_total * cont_other_pct))
            cont_male   = cont_total - cont_female - cont_other

            # Differently abled
            da_perm  = max(1, _round(emp_total  * (0.016 + fy_idx * 0.0005)))
            da_cont  = max(0, _round(cont_total * (0.006 + fy_idx * 0.0002)))

            # New hires & turnover
            new_male   = _round(perm_male   * (0.065 + fy_idx * 0.002))
            new_female = _round(perm_female * (0.085 + fy_idx * 0.002))
            new_other  = max(0, _round(perm_other * 0.05))
            turn_male   = _round(perm_male   * (0.060 - fy_idx * 0.001))
            turn_female = _round(perm_female * (0.050 - fy_idx * 0.001))

            # Wages — Plant 1 base ₹7L in FY19-20, growing 7% YoY
            base_wage = 700_000 * WAGE_SCALE[pn] * (1.07 ** fy_idx)
            # Female perm wage: starts at 94% of male, closing 0.5pp/year
            wage_gap_pct = 0.94 + fy_idx * 0.005
            wage_perm_male   = _round(base_wage)
            wage_perm_female = _round(base_wage * wage_gap_pct)
            # Contractual = 58% of permanent
            wage_cont_male   = _round(base_wage * 0.58)
            wage_cont_female = _round(base_wage * 0.58 * 0.97)

            # Benefits
            cont_health_ins = round(0.78 + fy_idx * 0.012, 3)
            maternity = 100.0
            paternity = round(60.0 + fy_idx * 3.0, 1)  # grows 3pp/year

            rows.append({
                "FY": fy,
                "StartYear": start_year,
                "PlantId": plant["PlantId"],
                "PlantName": pn,
                "Region": plant["Region"],
                "StateProvince": plant["StateProvince"],
                "City": plant["City"],
                "Country": plant["Country"],
                "PermanentMale": perm_male,
                "PermanentFemale": perm_female,
                "PermanentOther": perm_other,
                "ContractualMale": cont_male,
                "ContractualFemale": cont_female,
                "ContractualOther": cont_other,
                "DifferentlyAbledPermanent": da_perm,
                "DifferentlyAbledContractual": da_cont,
                "NewHiresMale": new_male,
                "NewHiresFemale": new_female,
                "NewHiresOther": new_other,
                "TurnoverMale": turn_male,
                "TurnoverFemale": turn_female,
                "AvgWagePermanentMaleINR": wage_perm_male,
                "AvgWagePermanentFemaleINR": wage_perm_female,
                "AvgWageContractualMaleINR": wage_cont_male,
                "AvgWageContractualFemaleINR": wage_cont_female,
                "HealthInsurancePermanentPct": 100.0,
                "HealthInsuranceContractualPct": round(cont_health_ins * 100, 1),
                "AccidentInsurancePct": 100.0,
                "MaternityLeavePct": maternity,
                "PaternityLeavePct": paternity,
                "PFCoveredPct": 100.0,
                "GratuityEligiblePct": 100.0,
                "ESICoveredPct": 100.0,
            })

    df = pd.DataFrame(rows)

    path = os.path.join(DATA_DIR, "BRSR_Workforce_Dataset_FY2020_FY2025.xlsx")
    with pd.ExcelWriter(path, engine="openpyxl") as writer:
        # GRI convention: title in row 0, column headers in row 1 (_load_sheet uses header=1)
        df.to_excel(writer, sheet_name="Raw_Annual_Data", index=False, startrow=1)
        ws = writer.sheets["Raw_Annual_Data"]
        ws.cell(1, 1, "BRSR Workforce Dataset — FY2019-20 to FY2024-25")
    print(f"  Created: {path}  ({len(df)} rows)")
    return df


def generate_training_dataset(workforce_df):
    rows = []
    for plant in PLANTS:
        pn = plant["PlantName"]
        for fy, start_year in FY_PERIODS:
            fy_idx = start_year - 2019

            wf_row = workforce_df[
                (workforce_df["PlantName"] == pn) & (workforce_df["FY"] == fy)
            ]
            if wf_row.empty:
                continue
            wf = wf_row.iloc[0]

            emp_total  = wf["PermanentMale"] + wf["PermanentFemale"] + wf["PermanentOther"]
            safety_hrs = SAFETY_TRAINING_HOURS[(pn, start_year)]

            # Average safety hours per employee
            avg_safety_per_emp = safety_hrs / emp_total if emp_total > 0 else 0

            # Non-safety training hours per employee (technical, leadership, compliance, soft)
            technical_per_emp   = round(avg_safety_per_emp * 1.30, 1)
            leadership_per_emp  = round(avg_safety_per_emp * 0.35, 1)
            compliance_per_emp  = round(avg_safety_per_emp * 0.45, 1)
            soft_per_emp        = round(avg_safety_per_emp * 0.60, 1)

            avg_total_male   = round(avg_safety_per_emp + technical_per_emp + leadership_per_emp
                                     + compliance_per_emp + soft_per_emp + fy_idx * 0.8, 1)
            avg_total_female = round(avg_total_male + 2.0, 1)  # intentional +2 hrs policy

            male_total   = wf["PermanentMale"]
            female_total = wf["PermanentFemale"]
            other_total  = wf["PermanentOther"]
            total_all    = male_total + female_total + other_total

            avg_all = round(
                (male_total * avg_total_male + female_total * avg_total_female + other_total * avg_total_male)
                / total_all, 1
            ) if total_all > 0 else 0

            coverage    = round(min(95.0, 86.0 + fy_idx * 1.2), 1)
            trained_emp = _round(total_all * coverage / 100)

            skill_upgrade = round(min(55.0, 38.0 + fy_idx * 2.8), 1)
            perf_review   = round(min(100.0, 92.0 + fy_idx * 1.2), 1)

            # Training spend per employee (₹): starts ₹1800, grows 6% YoY
            spend_per_emp = _round(1800 * (1.06 ** fy_idx))
            total_spend   = _round(spend_per_emp * total_all)

            ext_training_pct    = round(min(28.0, 15.0 + fy_idx * 2.0), 1)
            online_training_pct = round(min(35.0, 10.0 + fy_idx * 4.0), 1)

            rows.append({
                "FY": fy,
                "StartYear": start_year,
                "PlantId": plant["PlantId"],
                "PlantName": pn,
                "Region": plant["Region"],
                "StateProvince": plant["StateProvince"],
                "City": plant["City"],
                "Country": plant["Country"],
                "TotalEmployeesTrained": trained_emp,
                "TrainingCoveragePct": coverage,
                "AvgTrainingHrsPerEmployeeMale": avg_total_male,
                "AvgTrainingHrsPerEmployeeFemale": avg_total_female,
                "AvgTrainingHrsAllEmployees": avg_all,
                "SafetyTrainingHrsPermanent": safety_hrs,
                "TechnicalSkillsHrsPerEmp": technical_per_emp,
                "LeadershipHrsPerEmp": leadership_per_emp,
                "ComplianceHrsPerEmp": compliance_per_emp,
                "SoftSkillsHrsPerEmp": soft_per_emp,
                "SkillUpgradePct": skill_upgrade,
                "PerformanceReviewCoveragePct": perf_review,
                "TrainingSpendPerEmployeeINR": spend_per_emp,
                "TrainingSpendTotalINR": total_spend,
                "ExternalTrainingPct": ext_training_pct,
                "OnlineTrainingPct": online_training_pct,
            })

    df = pd.DataFrame(rows)

    path = os.path.join(DATA_DIR, "BRSR_Training_Dataset_FY2020_FY2025.xlsx")
    with pd.ExcelWriter(path, engine="openpyxl") as writer:
        df.to_excel(writer, sheet_name="Raw_Annual_Data", index=False, startrow=1)
        ws = writer.sheets["Raw_Annual_Data"]
        ws.cell(1, 1, "BRSR Training Dataset — FY2019-20 to FY2024-25")
    print(f"  Created: {path}  ({len(df)} rows)")
    return df


def generate_csr_dataset():
    CATEGORIES = [
        ("Education & Skill Development", 0.35, 2000),
        ("Healthcare & Sanitation",        0.25, 3500),
        ("Rural Development & Livelihood", 0.20, 1200),
        ("Environment & Ecology",          0.10,  500),
        ("Women Empowerment",              0.07, 1800),
        ("Sports & Culture",               0.03,  800),
    ]

    LOCATION_STATES = ["Maharashtra; Tamil Nadu", "Tamil Nadu; Maharashtra",
                       "Maharashtra; West Bengal; Tamil Nadu",
                       "Gujarat; Maharashtra", "Tamil Nadu; Gujarat",
                       "Maharashtra; Tamil Nadu; Delhi"]

    IMPLEMENTING_AGENCIES = [
        "GreenRoots Foundation", "EduReach Trust", "HealthFirst NGO",
        "Rural Connect Society", "EmpowerHer Initiative", "Prayas Foundation",
    ]

    PROJECT_NAMES = {
        "Education & Skill Development": ["Skill India Project - Carbon Black Region", "Vocational Training for Youth"],
        "Healthcare & Sanitation":        ["Mobile Health Clinic Initiative", "Clean Drinking Water Program"],
        "Rural Development & Livelihood": ["Farmer Support & Livelihood Program", "Rural Infrastructure Development"],
        "Environment & Ecology":          ["Tree Plantation Drive — 10,000 Trees", "Wetland Conservation Initiative"],
        "Women Empowerment":              ["Women Self-Help Group Support", "Women Entrepreneur Development"],
        "Sports & Culture":               ["Sports Facilities for Local Youth", "Cultural Heritage Preservation"],
    }

    rows = []
    for fy, start_year in FY_PERIODS:
        fy_idx = start_year - 2019

        # Obligation grows 8% per FY from ₹8.5 Cr base
        obligation = round(8.5 * (1.08 ** fy_idx), 2)
        # Spend is 98-105% of obligation (compliance-driven)
        spend_ratio = 1.00 + (fy_idx % 3) * 0.02 - 0.01
        total_spent = round(obligation * max(0.97, min(1.06, spend_ratio)), 2)
        unspent = round(max(0.0, obligation - total_spent), 2)

        for i, (cat, cat_pct, bene_per_cr) in enumerate(CATEGORIES):
            cat_spend = round(total_spent * cat_pct, 2)
            beneficiaries = _round(cat_spend * bene_per_cr)
            impact_done = "Yes" if start_year < 2023 else "No"

            # Project details
            project_names = PROJECT_NAMES.get(cat, ["General CSR Project"])
            proj_name = project_names[fy_idx % len(project_names)]
            agency = IMPLEMENTING_AGENCIES[i % len(IMPLEMENTING_AGENCIES)]
            loc_state = LOCATION_STATES[fy_idx % len(LOCATION_STATES)]

            rows.append({
                "FY": fy,
                "StartYear": start_year,
                "ObligationCrore": obligation,
                "TotalSpentCrore": total_spent,
                "UnspentCrore": unspent,
                "ProjectCategory": cat,
                "ProjectName": proj_name,
                "SpentCrore": cat_spend,
                "BeneficiaryCount": beneficiaries,
                "LocationState": loc_state,
                "ImplementingAgency": agency,
                "ImpactAssessmentDone": impact_done,
                "OngoingOrNew": "Ongoing" if fy_idx > 0 else "New",
            })

    df = pd.DataFrame(rows)

    path = os.path.join(DATA_DIR, "BRSR_CSR_Dataset_FY2020_FY2025.xlsx")
    with pd.ExcelWriter(path, engine="openpyxl") as writer:
        df.to_excel(writer, sheet_name="Raw_Annual_Data", index=False, startrow=1)
        ws = writer.sheets["Raw_Annual_Data"]
        ws.cell(1, 1, "BRSR CSR Dataset — FY2019-20 to FY2024-25")
    print(f"  Created: {path}  ({len(df)} rows)")
    return df


if __name__ == "__main__":
    print("Generating BRSR synthetic datasets...")
    wf_df = generate_workforce_dataset()
    tr_df = generate_training_dataset(wf_df)
    csr_df = generate_csr_dataset()
    print("Done. All 3 files written to", os.path.abspath(DATA_DIR))
