import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as ProjectAPI from '../api/projects';
import { parseApiError } from '../utils/errorHandler';
import * as ParcelAPI from '../api/parcels';
import { computeScenario } from '../domain/computeScenario';
import { ProjectSchema } from '../domain/schema';
import { SITE_POLICY, CENTRAL_BONUS_ITEMS, LOCAL_BONUS_ITEMS, DISASTER_BONUS_ITEMS, CHLORIDE_BONUS_ITEMS } from '../domain/constants';
import { normalizeBonusDetails } from '../domain/migrations';

// 1. Define Initial State separately for reset/migration usage
const initialState = {
    projects: [],
    selectedProject: null,

    // Scenario Inputs (Session State - Source of Truth for Computation)
    siteInputs: { mixedZonePolicy: SITE_POLICY.WEIGHTED }, // [NEW] Detached Site Config (Integration Risk, BCR/FAR limits override)
    massingInputs: {
        design_coverage: 45.0, exemption_coef: 1.15, public_ratio: 33.0, me_rate: 15.0, stair_rate: 10.0, balcony_rate: 5.0,
        residential_rate: 60.0, commercial_rate: 30.0, agency_rate: 10.0
    },
    basementInputs: {
        legal_parking: 0, bonus_parking: 0, excavation_rate: 70.0, parking_space_area: 40.0, floor_height: 3.3,
        motorcycle_unit_area: 4.0, legal_motorcycle: 0
    },
    bonusData: {
        bonus_central: 30.0, bonus_local: 20.0,
        bonus_other: 0.0, // Legacy
        disaster_renewal_bonus_ratio: 0.0, // Canonical
        bonus_chloride: 0.0,
        bonus_tod: 0.0, // Canonical
        bonus_soil_mgmt: 0.0, bonus_public_exemption: 7.98, bonus_cap: 100.0
    },
    // Detailed Checklists
    centralBonusDetails: { checklist: {}, enabled: true, calculation_mode: 'auto' },
    localBonusDetails: { checklist: {}, enabled: true, calculation_mode: 'manual' },
    disasterRenewalBonusDetails: { checklist: {}, enabled: true },
    chlorideBonusDetails: { checklist: {}, calculation_mode: 'original_ratio' },
    tod_bonus_details: { checklist: {}, calc_result: {} }, // [NEW] Canonical TOD Details

    // Computed
    computedResult: null,
    baselineResult: null,
    computationError: null, // [NEW] Error State

    // UI State (Transient / Persisted)
    isLoading: false,
    error: null,
    draftBonusDetails: null, // Modal Draft state
    activeDraftKey: null,

    // Project Management UI State
    projectSearch: '',
    projectSort: 'recent_updated',
    showArchived: false
};

const useProjectStore = create(
    persist(
        (set, get) => ({
            ...initialState,

            // UI Actions
            setProjectSearch: (v) => set({ projectSearch: v }),
            setProjectSort: (v) => set({ projectSort: v }),
            toggleShowArchived: () => set(state => ({ showArchived: !state.showArchived })),

            // Actions
            fetchProjects: async () => {
                set({ isLoading: true, error: null });
                try {
                    // For MVP: Fetch ALL and filter client-side, OR pass params.
                    // To ensure we get everything including archived if needed (or we fetch active only by default?)
                    // Let's blindly fetch all for now and filter in UI, simplest for small dataset.
                    const projects = await ProjectAPI.fetchProjects();
                    set({ projects, isLoading: false });
                } catch (error) {
                    const parsedError = parseApiError(error);
                    console.error("Structured Error for User:", parsedError);
                    set({ error: parsedError, isLoading: false });
                }
            },

            pinProject: async (id, isPinned) => {
                try {
                    await ProjectAPI.updateProject(id, { is_pinned: isPinned ? 1 : 0 }); // API expects Int usually? Schema says Int.
                    // Optimistic Update
                    set(state => ({
                        projects: state.projects.map(p => p.id == id ? { ...p, is_pinned: isPinned ? 1 : 0 } : p)
                    }));
                } catch (e) {
                    console.error(e);
                    get().fetchProjects(); // Revert on fail
                }
            },

            archiveProject: async (id) => {
                try {
                    const now = new Date().toISOString();
                    await ProjectAPI.updateProject(id, { archived_at: now });
                    set(state => ({
                        projects: state.projects.map(p => p.id == id ? { ...p, archived_at: now } : p)
                    }));
                } catch (e) { console.error(e); }
            },

            restoreProject: async (id) => {
                try {
                    await ProjectAPI.updateProject(id, { archived_at: null });
                    set(state => ({
                        projects: state.projects.map(p => p.id == id ? { ...p, archived_at: null } : p)
                    }));
                } catch (e) { console.error(e); }
            },

            markProjectOpened: async (id) => {
                try {
                    const now = new Date().toISOString();
                    await ProjectAPI.updateProject(id, { last_opened_at: now });
                    // No need to blocking wait or full refresh, just update local list
                    set(state => ({
                        projects: state.projects.map(p => p.id == id ? { ...p, last_opened_at: now } : p)
                    }));
                } catch (e) { console.error(e); }
            },

            createProject: async (name) => {
                try {
                    await ProjectAPI.createProject(name);
                    get().fetchProjects();
                } catch (error) {
                    console.error(error);
                }
            },

            selectProject: async (project) => {
                // When selecting, we also fetch details to ensure we have latest parcels
                try {
                    // 1. Fetch Fresh Data (Reference)
                    const rawProject = await ProjectAPI.fetchProjectDetails(project.id);

                    // 2. Data Normalization
                    const fullProjectCandidate = {
                        ...rawProject,
                        id: String(rawProject.id),
                        site: rawProject.site_config || {}, // Map backend JSON to frontend key
                        land_parcels: rawProject.land_parcels?.map(p => ({
                            ...p,
                            id: String(p.id),
                            // Map snake_case (Backend) to camelCase (Frontend Schema)
                            bcrLimit: p.bcr_limit,
                            farLimit: p.far_limit,
                            ownershipStatus: p.ownership_status || p.tenure,
                            integrationRisk: p.integration_risk,
                            includeInSite: p.include_in_site !== 0 // DB Integer -> Boolean
                        })) || [],
                        // Normalize site_config for legacy values
                        site: {
                            ...(rawProject.site_config || {}),
                            mixedZonePolicy: (rawProject.site_config?.mixedZonePolicy === 'weighted' || !rawProject.site_config?.mixedZonePolicy)
                                ? SITE_POLICY.WEIGHTED
                                : rawProject.site_config.mixedZonePolicy
                        }
                    };

                    // 3. Validation (Schema Migration)
                    const parseResult = ProjectSchema.safeParse(fullProjectCandidate);
                    if (!parseResult.success) {
                        console.warn("[Schema Validation Warning] Project data mismatch:", parseResult.error.format());
                    }
                    // Use parsed data if success, otherwise fall back to candidate (Best Effort)
                    const fullProject = parseResult.success ? parseResult.data : fullProjectCandidate;

                    // 4. Hydrate Session Inputs from Reference Data
                    // 4. Hydrate Session Inputs from Reference Data
                    const siteInputs = {
                        ...fullProject.site,
                        // Ensure legitimate default if missing
                        mixedZonePolicy: fullProject.site?.mixedZonePolicy ?? SITE_POLICY.WEIGHTED
                    };
                    const massingInputs = {
                        design_coverage: fullProject.massing_design_coverage ?? 45.0,
                        exemption_coef: fullProject.massing_exemption_coef ?? 1.15,
                        public_ratio: fullProject.massing_public_ratio ?? 33.0,
                        me_rate: fullProject.massing_me_rate ?? 15.0,
                        stair_rate: fullProject.massing_stair_rate ?? 10.0,
                        balcony_rate: fullProject.massing_balcony_rate ?? 5.0,
                        residential_rate: fullProject.usage_residential_rate ?? 60.0,
                        commercial_rate: fullProject.usage_commercial_rate ?? 30.0,
                        agency_rate: fullProject.usage_agency_rate ?? 10.0
                    };

                    const basementInputs = {
                        legal_parking: fullProject.basement_legal_parking ?? 0,
                        bonus_parking: fullProject.basement_bonus_parking ?? 0,
                        excavation_rate: fullProject.basement_excavation_rate ?? 70.0,
                        parking_space_area: fullProject.basement_parking_space_area ?? 40.0,
                        floor_height: fullProject.basement_floor_height ?? 3.3,
                        motorcycle_unit_area: fullProject.basement_motorcycle_unit_area ?? 4.0,
                        legal_motorcycle: fullProject.basement_legal_motorcycle ?? 0
                    };

                    const bonusData = {
                        bonus_central: fullProject.bonus_central ?? 30.0,
                        bonus_local: fullProject.bonus_local ?? 20.0,
                        // [Fix] Canonical: use 'bonus_other' as primary. Map alias if needed.
                        bonus_other: fullProject.bonus_other ?? fullProject.disaster_renewal_bonus_ratio ?? 0.0,
                        disaster_renewal_bonus_ratio: fullProject.bonus_other ?? fullProject.disaster_renewal_bonus_ratio ?? 0.0, // UI Alias
                        bonus_chloride: fullProject.bonus_chloride ?? 0.0,
                        bonus_soil_mgmt: fullProject.bonus_soil_mgmt ?? 0.0,
                        bonus_tod: fullProject.bonus_tod ?? fullProject.bonus_tod_increment ?? 0.0, // Consolidate Legacy
                        bonus_public_exemption: fullProject.bonus_public_exemption ?? 7.98,
                        bonus_cap: fullProject.bonus_cap ?? 100.0,

                        // Hydrate Details (Full)
                        centralBonusDetails: fullProject.central_bonus_details || {},
                        localBonusDetails: fullProject.local_bonus_details || {},
                        disasterBonusDetails: fullProject.disaster_renewal_bonus_details || fullProject.disaster_bonus_details || {},
                        chlorideBonusDetails: fullProject.chloride_bonus_details || {},
                        // Legacy todIncrementBonusDetails support removed or mapped if needed?
                        // If backend sends it, we map it to canonical `tod_bonus_details` in migration if needed.
                        // For now we assume normalize/migration did its job.
                        tod_bonus_details: fullProject.tod_bonus_details || fullProject.todIncrementBonusDetails || {}
                    };

                    set({
                        selectedProject: fullProject, // Keep as Reference
                        siteInputs,                   // [NEW] Working Copy
                        massingInputs,
                        basementInputs,
                        bonusData,
                        centralBonusDetails: normalizeBonusDetails(fullProject.central_bonus_details || fullProject.centralBonusDetails, CENTRAL_BONUS_ITEMS, 'central_bonus_details'),
                        localBonusDetails: normalizeBonusDetails(fullProject.local_bonus_details || fullProject.localBonusDetails, LOCAL_BONUS_ITEMS, 'local_bonus_details'),
                        disasterBonusDetails: normalizeBonusDetails(fullProject.disaster_bonus_details || fullProject.disasterBonusDetails, DISASTER_BONUS_ITEMS, 'disaster_bonus_details'),
                        chlorideBonusDetails: normalizeBonusDetails(fullProject.chloride_bonus_details || fullProject.chlorideBonusDetails, CHLORIDE_BONUS_ITEMS, 'chloride_bonus_details'),
                        // [Fix] Normalize Canonical TOD, Dropped Legacy Increment
                        tod_bonus_details: normalizeBonusDetails(fullProject.tod_bonus_details || fullProject.todIncrementBonusDetails, {}, 'tod_bonus_details')
                    });
                    get().runComputation();
                } catch (error) {
                    console.error(error);
                }
            },

            updateProject: (updates) => {
                set(state => {
                    const newProject = { ...state.selectedProject, ...updates };
                    return { selectedProject: newProject };
                });
                // Note: If updates contain data relevant to inputs (like renaming), inputs are fine.
                // If updates contained scenarios, we might need re-hydration, but usually updateProject is for meta.
                get().runComputation();
            },

            updateSiteConfig: (siteUpdates) => {
                // Now strictly updates siteInputs (Session State)
                // Does NOT mutate selectedProject until Save.
                set(state => {
                    const newSite = { ...state.siteInputs, ...siteUpdates };
                    return { siteInputs: newSite };
                });
                get().runComputation();
            },

            // [NEW] Specific Action for Mixed Zone Policy as requested
            setMixedZonePolicy: (policy) => {
                get().updateSiteConfig({ mixedZonePolicy: policy });
            },

            // Parcel Actions
            addParcel: async (parcel) => {
                try {
                    const payload = {
                        ...parcel,
                        bcr_limit: parcel.bcrLimit,
                        far_limit: parcel.farLimit,
                        ownership_status: parcel.ownershipStatus,
                        integration_risk: parcel.integrationRisk,
                        include_in_site: parcel.includeInSite !== false ? 1 : 0
                    };

                    const saved = await ParcelAPI.createParcel(get().selectedProject.id, payload);

                    const pStr = {
                        ...saved,
                        id: String(saved.id),
                        bcrLimit: saved.bcr_limit, farLimit: saved.far_limit,
                        ownershipStatus: saved.ownership_status, integrationRisk: saved.integration_risk,
                        includeInSite: saved.include_in_site !== 0
                    };

                    set(state => {
                        const newParcels = [...state.selectedProject.land_parcels, pStr];

                        // Sync Selection to Site Inputs
                        const currentIds = state.siteInputs?.selectedParcelIds || [];
                        let newIds = [...currentIds];
                        if (pStr.includeInSite) {
                            newIds.push(pStr.id);
                        }

                        return {
                            selectedProject: {
                                ...state.selectedProject,
                                land_parcels: newParcels // Keep parcels synced in Project for listing
                            },
                            // Also update Site Inputs selection
                            siteInputs: { ...state.siteInputs, selectedParcelIds: newIds }
                        };
                    });
                    get().runComputation();
                } catch (e) {
                    console.error(e);
                }
            },

            updateParcel: async (id, updates) => {
                try {
                    const payload = { ...updates };
                    if (updates.bcrLimit !== undefined) payload.bcr_limit = updates.bcrLimit;
                    if (updates.farLimit !== undefined) payload.far_limit = updates.farLimit;
                    if (updates.ownershipStatus !== undefined) payload.ownership_status = updates.ownershipStatus;
                    if (updates.integrationRisk !== undefined) payload.integration_risk = updates.integrationRisk;
                    if (updates.includeInSite !== undefined) payload.include_in_site = updates.includeInSite ? 1 : 0;

                    const updated = await ParcelAPI.updateParcel(id, payload);

                    const pStr = {
                        ...updated,
                        id: String(updated.id),
                        bcrLimit: updated.bcr_limit, farLimit: updated.far_limit,
                        ownershipStatus: updated.ownership_status, integrationRisk: updated.integration_risk,
                        includeInSite: updated.include_in_site !== 0
                    };

                    set(state => {
                        const newParcels = state.selectedProject.land_parcels.map(p => p.id === String(id) ? pStr : p);

                        // Sync Selection logic
                        // [Fix] Site Area Source of Truth
                        // Priority: Project Site Config > Project Site > Explicit List
                        const rawSelectedIds = state.selectedProject.site_config?.selectedParcelIds ?? state.selectedProject.site?.selectedParcelIds ?? [];
                        const selectedIds = new Set(rawSelectedIds.map(String));

                        // Resolve In-Site Parcels
                        // Filter: Must be 'include_in_site' (if flag exists) AND in selected list (if selection active)
                        let inSiteParcels = newParcels; // Use the updated parcels
                        if (selectedIds.size > 0) {
                            inSiteParcels = newParcels.filter(p => selectedIds.has(String(p.id)));
                        }

                        // Calculate Site Area safely (Ensure no crash)
                        const siteArea = inSiteParcels.reduce((sum, p) => sum + (Number(p.area_m2) || 0), 0);

                        // Sync activeParcels for downstream reuse
                        const activeParcels = inSiteParcels;

                        const currentIds = state.siteInputs?.selectedParcelIds || [];
                        let newIds = new Set(currentIds);
                        if (updates.includeInSite === true) newIds.add(String(id));
                        if (updates.includeInSite === false) newIds.delete(String(id));

                        return {
                            selectedProject: {
                                ...state.selectedProject,
                                land_parcels: newParcels
                            },
                            siteInputs: { ...state.siteInputs, selectedParcelIds: Array.from(newIds), siteArea: siteArea, activeParcels: activeParcels }
                        };
                    });
                    get().runComputation();
                } catch (e) { console.error(e); }
            },

            // Input Setters
            setMassingInput: (key, value) => {
                set((state) => ({
                    massingInputs: { ...state.massingInputs, [key]: value }
                }));
                get().runComputation();
            },

            setBasementInput: (key, value) => {
                set((state) => ({
                    basementInputs: { ...state.basementInputs, [key]: value }
                }));
                get().runComputation();
            },

            setBonusData: (key, value) => {
                set((state) => ({
                    bonusData: { ...state.bonusData, [key]: value }
                }));
                get().runComputation();
            },

            // Setters for Details (Checklist Updates)
            setCentralBonusDetail: (items) => {
                set((state) => ({
                    centralBonusDetails: {
                        ...state.centralBonusDetails,
                        checklist: { ...state.centralBonusDetails.checklist, ...items }
                    }
                }));
            },

            setLocalBonusDetail: (items) => {
                set((state) => ({
                    localBonusDetails: {
                        ...state.localBonusDetails,
                        checklist: { ...state.localBonusDetails.checklist, ...items }
                    }
                }));
            },

            setDisasterBonusDetail: (items) => {
                set((state) => ({
                    disasterBonusDetails: {
                        ...state.disasterBonusDetails,
                        checklist: { ...state.disasterBonusDetails.checklist, ...items }
                    }
                }));
            },

            setBonusDetailStruct: (key, partialStruct) => {
                set((state) => {
                    const current = state[key] || { checklist: {} };
                    const newChecklist = partialStruct.checklist ? { ...current.checklist, ...partialStruct.checklist } : current.checklist;
                    return {
                        [key]: { ...current, ...partialStruct, checklist: newChecklist }
                    };
                });
            },

            setFullBonusData: (data) => {
                set({ bonusData: data });
                get().runComputation();
            },

            // --- Draft / Commit Pattern ---
            getBonusDetails: (key) => {
                const state = get();
                const map = {
                    'bonus_central': 'centralBonusDetails',
                    'bonus_local': 'localBonusDetails',
                    'bonus_other': 'disasterBonusDetails',
                    'disaster_renewal_bonus_ratio': 'disasterBonusDetails', // [Standardized]
                    'bonus_chloride': 'chlorideBonusDetails',
                    'bonus_tod': 'tod_bonus_details' // [Fix] Canonical Mapping
                };
                const internalKey = map[key];
                if (!internalKey) return null;
                return state[internalKey];
            },

            initDraft: (key) => {
                const details = get().getBonusDetails(key);
                set({
                    activeDraftKey: key,
                    draftBonusDetails: details ? JSON.parse(JSON.stringify(details)) : { checklist: {}, enabled: true }
                });
            },

            setBonusDetailsDraft: (patch) => {
                set((state) => {
                    if (!state.draftBonusDetails) return {};
                    let newChecklist = state.draftBonusDetails.checklist;
                    if (patch.checklist) {
                        newChecklist = { ...newChecklist, ...patch.checklist };
                    }
                    return {
                        draftBonusDetails: { ...state.draftBonusDetails, ...patch, checklist: newChecklist }
                    };
                });
            },

            commitBonusDetails: (key) => {
                const state = get();
                // Validation
                if (state.activeDraftKey !== key) {
                    console.error(`Draft Mismatch: Active(${state.activeDraftKey}) != Commit(${key})`);
                    return;
                }
                if (!state.draftBonusDetails) return;

                const map = {
                    'bonus_central': 'centralBonusDetails',
                    'bonus_local': 'localBonusDetails',
                    'bonus_other': 'disasterBonusDetails',
                    'disaster_renewal_bonus_ratio': 'disasterBonusDetails', // [Standardized]
                    'bonus_chloride': 'chlorideBonusDetails',
                    'bonus_tod': 'tod_bonus_details' // [Fix] Canonical Mapping
                };
                const internalKey = map[key];
                if (!internalKey) return;

                // Commit
                set({
                    [internalKey]: state.draftBonusDetails,
                    draftBonusDetails: null, // Clear draft
                    activeDraftKey: null
                });
                get().runComputation();
            },

            discardDraft: () => {
                set({ draftBonusDetails: null, activeDraftKey: null });
            },

            // Main Calculation Trigger
            runComputation: () => {
                const state = get();
                if (!state.selectedProject) return;

                // Construct Scenario Input using Session State (Inputs)
                // Note: We used to rely on project.site in computeScenario,
                // now we must explicitly pass our detached siteInputs.
                // However, computeScenario might expect 'project.site' internally.
                // We should check computeScenario signature.
                // Assume computeScenario takes { project, bonus, ... }
                // We construct a "Virtual Project" reflecting current inputs for calculation validity.

                const virtualProject = {
                    ...state.selectedProject,
                    site: state.siteInputs // Inject detached site config
                };

                const scenarioInput = {
                    project: virtualProject,
                    bonus: {
                        ...state.bonusData,
                        centralBonusDetails: state.centralBonusDetails,
                        localBonusDetails: state.localBonusDetails,
                        disasterBonusDetails: state.disasterBonusDetails
                    },
                    massing: state.massingInputs,
                    basement: state.basementInputs
                };

                try {
                    const result = computeScenario(scenarioInput);
                    // On Success: Set Result and Clear Error
                    set({ computedResult: result, computationError: null });
                } catch (e) {
                    // On Error: Set Error, KEEP previous computedResult (don't wipe)
                    console.error("Calculation Error:", e);
                    set({ computationError: `計算錯誤: ${e.message}` });
                }
            },

            captureBaseline: () => {
                const { computedResult } = get();
                if (computedResult) {
                    set({ baselineResult: JSON.parse(JSON.stringify(computedResult)) });
                }
            },

            clearBaseline: () => {
                set({ baselineResult: null });
            },

            // Persist Current Scenario to DB
            saveScenario: async () => {
                const state = get();
                if (!state.selectedProject) return;

                const payload = {
                    ...state.selectedProject,
                    site_config: state.siteInputs || {}, // Persist detached Site Inputs
                    ...state.bonusData,

                    massing_design_coverage: state.massingInputs.design_coverage,
                    massing_exemption_coef: state.massingInputs.exemption_coef,
                    massing_public_ratio: state.massingInputs.public_ratio,
                    massing_me_rate: state.massingInputs.me_rate,
                    massing_stair_rate: state.massingInputs.stair_rate,
                    massing_balcony_rate: state.massingInputs.balcony_rate,
                    usage_residential_rate: state.massingInputs.residential_rate,
                    usage_commercial_rate: state.massingInputs.commercial_rate,
                    usage_agency_rate: state.massingInputs.agency_rate,

                    basement_legal_parking: state.basementInputs.legal_parking,
                    basement_bonus_parking: state.basementInputs.bonus_parking,
                    basement_excavation_rate: state.basementInputs.excavation_rate,
                    basement_parking_space_area: state.basementInputs.parking_space_area,
                    basement_floor_height: state.basementInputs.floor_height,
                    basement_motorcycle_unit_area: state.basementInputs.motorcycle_unit_area,
                    basement_legal_motorcycle: state.basementInputs.legal_motorcycle,

                    central_bonus_details: state.centralBonusDetails,
                    local_bonus_details: state.localBonusDetails,
                    disaster_renewal_bonus_details: state.disasterBonusDetails,
                    chloride_bonus_details: state.chlorideBonusDetails,
                    tod_bonus_details: state.tod_bonus_details,

                    // Canonical Persistence: Always send bonus_other
                    bonus_other: state.bonusData.bonus_other ?? state.bonusData.disaster_renewal_bonus_ratio ?? 0.0,
                    // Remove UI alias from payload to avoid confusion, or keep it if backend tolerates. 
                    // Requirement: "restoring canonical mapping... save payload uses bonus_other"
                    // We will NOT send disaster_renewal_bonus_ratio to backend to enforce canonical source.
                    disaster_bonus_details: state.disasterBonusDetails // Canonical Details Key
                };

                console.log("Saving Scenario Payload:", payload);
                await ProjectAPI.updateProject(state.selectedProject.id, payload);

                // After save, we ideally re-fetch or update selectedProject to match saved state
                // For now, strict separation means selectedProject is "DB State".
                // We should update it to confirm "Synced".
                set(s => ({
                    selectedProject: { ...s.selectedProject, site: s.siteInputs }
                }));
            }
        }),
        {
            name: 'project-storage', // name of the item in the storage (must be unique)
            version: 2, // 1) Persist加Version
            storage: createJSONStorage(() => localStorage), // (optional) by default, 'localStorage' is used

            // 2) Migrate Function
            migrate: (persistedState, version) => {
                console.log(`Migrating store from version ${version} to 2`);

                if (version < 2) {
                    // Example migration: if < 2, maybe structure changed entirely or just merge new fields
                    // Safe approach: Merge persisted state into initial state to fill holes
                    const safeState = { ...initialState, ...persistedState };

                    // Add any specific patch logic here (e.g. rename keys)
                    // if (!safeState.newField) safeState.newField = 'default';

                    return safeState;
                }

                return persistedState;
            },

            // 3) Partialize: Include siteInputs now
            partialize: (state) => ({
                projects: state.projects,
                selectedProject: state.selectedProject,
                siteInputs: state.siteInputs, // [NEW] Persist
                massingInputs: state.massingInputs,
                basementInputs: state.basementInputs,
                bonusData: state.bonusData,
                centralBonusDetails: state.centralBonusDetails,
                localBonusDetails: state.localBonusDetails,
                disasterBonusDetails: state.disasterBonusDetails,
                chlorideBonusDetails: state.chlorideBonusDetails,
                tod_bonus_details: state.tod_bonus_details,
                // UI Config Persistence
                showArchived: state.showArchived,
                projectSort: state.projectSort
                // Exclude: computedResult, isLoading, error, draftBonusDetails, projectSearch
            }),

            // 4) Hydration Fail-safe
            onRehydrateStorage: (state) => {
                console.log('Hydration starting...');
                return (state, error) => {
                    if (error) {
                        console.error('An error happened during hydration. Resetting storage.', error);
                        localStorage.removeItem('project-storage');
                        window.location.reload(); // Hard Reset or just let it be empty
                    } else {
                        console.log('Hydration finished');
                    }
                };
            },
        }
    )
);

export default useProjectStore;
