# Developer Checklist (Guarded Mode)

Before marking any task as complete, verify your changes against this list.

## 1. Schema & Data Consistency
- [ ] **Database Schema (`models.py`)**: Added columns/fields with appropriate types (nullable if optional).
- [ ] **Backend Schema (`schemas.py`)**: Updated Pydantic models (`ProjectBase`, `LandParcelBase`, etc.).
- [ ] **DB Migration**: Updated `patch_db.py` or created migration script?
- [ ] **Frontend Schema (`schema.js`)**: Updated Zod schemas?
  - [ ] Field names match Backend (snake_case -> camelCase mapping handled)?
  - [ ] Defaults provided for optional fields?
- [ ] **Initial State (`useProjectStore.js`)**: Added default value to `initialState` or `siteInputs`?
- [ ] **Persistence**: Added field to `partialize` whitelist?

## 2. Logic & Calculation
- [ ] **Constants (`constants.js`)**: Defined any new Enums or Rate constants?
- [ ] **Calculation Engine (`computeScenario.js`)**:
  - [ ] Updated logic to use new field.
  - [ ] Handled `null` / `undefined` safely (e.g. `check(x || 0)`).
- [ ] **Regression Test (`computeScenario.test.js`)**:
  - [ ] Added valid fixture for new field in `createProject`?
  - [ ] Ran `npm run test` and confirmed existing tests pass?
  - [ ] Created NEW test case if logic branched significantly?

## 3. UI & Experience
- [ ] **Input Component**: Is the field strictly controlled (has default value)?
- [ ] **Validation**: Does UI show error/warning if value is invalid?
- [ ] **Loading State**: Does it behave correctly during `fetchProjects`?
- [ ] **Error Handling**: Did you see the error boundary or toast if API fails?

## 4. Pre-Commit/Merge
- [ ] **Lint**: `npm run lint` passes?
- [ ] **Test**: `npm run test` passes (All snapshots match)?
- [ ] **Build**: `npm run build` succeeds?

## 5. Deployment/Ecosystem
- [ ] **Runbook**: Does this change require new ENV variables or setup steps? Update `README.md`.
