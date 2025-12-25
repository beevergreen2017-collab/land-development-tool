# Release Gate Checklist

To ensure a stable release, perform the following checks in order.

## 0. Clean Environment (Recommended)
Before a final release build, clean the environment to ensure no stale artifacts.

```powershell
Remove-Item -Recurse -Force .\node_modules -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .\dist -ErrorAction SilentlyContinue
npm ci
```
*Success Criteria:* `npm ci` completes without errors.

## 1. Automated Verification
Run the comprehensive system verification script.

```powershell
npm run verify:all
```

**Expected Output:**
```
🚀 Starting Professional System Verification...
[0/3] Validating Schema Contract...
  ✅ Schemas loaded successfully.
...
🟢 VERIFIED: System is robust and release-ready.
```

### 1.1 Failure Triage
If verification fails:
- **Stage 0 (Schema Contract)**: Check `src/domain/schema.js` exports and `src/verify_all.js` imports.
- **Stage 1 (Calculation Engine)**: Check `src/domain/computeScenario.js` and fixtures.
- **Stage 2 (Metadata & Snapshots)**: Check snapshot/audit generation in `computeScenario.js`.
- **Stage 3 (Comparator)**: Check `src/domain/comparator.js` and version logic.

## 2. Build & Lint
```powershell
npm run lint
npm run build
```
*Success Criteria:* No lint errors; Build generates `dist/` directory.

## 3. Manual UI Smoke Test (Required)
UI regressions are not covered by unit tests. Perform these checks:

### 3.1 Project Load
- Open the app and select an existing project.
- **Expected:** Land Parcels table and Map section render correctly.

### 3.2 Add / Edit Parcel Modal
- Click “新增地號” or edit icon.
- **Expected:** Modal contains:
  - 行政區 (District), 分區 (Zoning), 段名 (Section), 地號 (Lot No)
  - 面積 (Area m²), 公告現值 (Value)
  - “Auto Fetch Info” button
- **Action:** Save and verify table updates.

### 3.3 Show Sources / Audit
- Toggle “Show Sources” (if present).
- **Expected:** Audit tags appear; values match calculations.

### 3.4 Scenario Comparison
- Click “Capture Baseline”.
- Modify an input (e.g., floors / bonus).
- Enable “Show Comparison”.
- **Expected:** Comparison table shows Base vs Current, delta, and % change.

**Pass/Fail Rule:** If any check fails, the release is BLOCKED.

## 4. One-command Gate
Use this command for a full pass:

```powershell
npm run verify:gate
```
(Runs: verify -> lint -> build)
