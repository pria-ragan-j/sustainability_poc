# SASB Standard Reference Folder

This folder mirrors the purpose of `gri_standard/` (which holds the five official GRI standard PDFs used as the authoritative reference for `backend/gri_requirements.json`).

## What belongs here

The official **SASB Chemicals Sustainability Accounting Standard (RT-CH)** PDF, published by the IFRS Foundation / Value Reporting Foundation, should be placed in this folder — e.g.:

```
sasb_standard/SASB Chemicals Sustainability Accounting Standard.pdf
```

Optionally, the **SASB Implementation Guide for Activity Metrics** can also be added here if activity-metric definitions (e.g., production volume reporting conventions) need to be grounded against the official text.

## Why this file is a placeholder

This document was generated as part of implementing `SASB_INTEGRATION_PLAN.md` Section 8 ("Standards Management"). The actual SASB standard PDF is a copyrighted publication and was not fabricated or reproduced here — it must be obtained from the official source (the IFRS Foundation's Sustainability Disclosure Standards) and added manually.

`backend/sasb_requirements.json` was authored directly from the publicly known structure and metric definitions of the RT-CH standard (topic codes, metric names, units), following the same five-status taxonomy already used in `backend/gri_requirements.json`. Once the official PDF is added here, `sasb_requirements.json`'s `notes` fields should be cross-checked against it for precision (exact wording, accounting metrics, activity metrics) the same way `gri_requirements.json` was derived from the PDFs in `gri_standard/`.
