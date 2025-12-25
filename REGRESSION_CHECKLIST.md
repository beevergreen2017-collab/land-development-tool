# Regression Checklist for Land Data Flow Refactoring

## 1. Build & Syntax Verification
- [ ] **Frontend Build**: Run `npm run build` in `frontend/` to ensure no missing exports or syntax errors.
- [ ] **Console Errors**: Verify dev console (F12) has no red errors on load.
- [ ] **Zod Schema Validation**: Ensure `computeScenario` does not throw "Input Validation Failed" due to schema mismatch (especially with new `bcr`/`far` fields).

## 2. Land Parcel Baseline
- [ ] **Total Area**: Check "Total Area" in Site Summary matches sum of all parcels.
- [ ] **Allowed GFA**: Check "Total Allowed GFA" matches sum of `Area * Legal_Rate`.
- [ ] **Zero State**: Create a new project with 0 parcels. Ensure UI handles empty state gracefully (0 Area, 0 GFA).

## 3. Site Limits (Max GFA / BCR / FAR)
- [ ] **Manual Calculation Check**:
    - Input BCR: 50%
    - Input FAR: 300%
    - Verify "Max Building Area" = Total Area * 50%.
    - Verify "Max GFA" = Total Area * 300%.
- [ ] **Diff Calculation**:
    - Ensure "Diff" shows correct value (`TotalAllowedGFA - MaxGFA`).
    - Verify Red Warning appears if `Diff > Threshold`.
- [ ] **Persistence**: Refresh page. Verify BCR/FAR inputs retain values.

## 4. Scenario Computation (Responsibility Check)
- [ ] **UI Logic Removal**: Verify `ScenarioForm.jsx` no longer uses `useMemo` for `maxBuildingArea` or `maxGFA`.
- [ ] **Store Integration**: Verify `useProjectStore` correctly triggers `computeScenario` when BCR/FAR changes.

## 5. Bonus Modal Interactions
- [ ] **Data Flow**: Open "Central Bonus" modal.
    - Change a checklist item.
    - Click "Apply & Save".
    - Verify Main Table "Ratio" updates.
    - Verify "Total Bonus" and "Allowed Volume" update.
- [ ] **Refresh Resilience**: Refresh page after saving bonus. Verify detailed checklist state is preserved (e.g., radio buttons remain selected).

## 6. Three-Mode Switching (Site Configuration)
- [ ] **Add Parcel**: Test adding a new parcel via modal.
- [ ] **Edit Parcel**: Edit area of existing parcel.
- [ ] **Delete Parcel** (if applicable): Ensure totals update immediately.
