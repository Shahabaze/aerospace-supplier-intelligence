# Test Fixtures

Small, deliberately faulty CSV files used by `../data-layer-tests.html` to prove that the data loader detects problems. They are **not** used by the application, and the real files in `data/` are never altered.

| File | Deliberate faults |
|---|---|
| `delivery_type_errors.csv` | Non-ISO date (`2025/12/08`), impossible date (`2026-02-30`), non-numeric quantity (`abc`), invalid on-time flag (`2`), required quantity left blank, a row with an extra column. Also contains valid blanks and zeros to prove blanks stay blank and zeros stay zero. |
| `materials_missing_column.csv` | The `shelf_life_days` column is missing. |

Control-level negative tests (C01–C17, S01–S06) do not need extra files. The test page copies the real data in memory, changes one value per test, and confirms the targeted control fails. The copy is discarded and the source files are untouched.
