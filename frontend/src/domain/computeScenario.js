import { AUDIT_SOURCES } from './auditMap.js';
import { computeObjectHash } from '../utils/hash.js';
import { calculateBonus } from './calculators/bonus.js';
import { calculateMassing } from './calculators/massing.js';
import { calculateBasement } from './calculators/basement.js';
import { calculateParcelBaseline, calculateSiteOutcome } from './calculators/site.js';
import { ScenarioInputSchema, CalculationResultSchema } from './schema.js';

// Helper to ensure schemas are loaded correctly at runtime
const assertZodSchema = (name, s) => {
    const ok = s && typeof s.safeParse === "function";
    if (!ok) {
        console.error("[SCHEMA_UNDEFINED]", name, s);
        throw new Error(`[SCHEMA_UNDEFINED] ${name}`);
    }
};

assertZodSchema("ScenarioInputSchema", ScenarioInputSchema);
assertZodSchema("CalculationResultSchema", CalculationResultSchema);

/**
 * Pure Calculation Engine
 * @param {z.infer<typeof ScenarioInputSchema>} input 
 * @returns {z.infer<typeof CalculationResultSchema>}
 */
export const computeScenario = (input) => {
    // Fail-fast schema check (redundant but safe)
    if (!ScenarioInputSchema || !CalculationResultSchema) {
        throw new Error("Critical: Zod Schemas are undefined. Check src/domain/schema.js for circular dependencies.");
    }
    // ... (existing validation and calculation logic)
    // Pre-normalization for Zod
    if (input.project) {
        if (input.project.id != null) input.project.id = String(input.project.id);
        if (Array.isArray(input.project.land_parcels)) {
            input.project.land_parcels.forEach(p => {
                if (p.id != null) p.id = String(p.id);
            });
        }
    }

    // Fail-fast checks for schemas
    if (!ScenarioInputSchema || !CalculationResultSchema) {
        const msg = `CRITICAL: Zod Schemas are undefined. This usually means a circular dependency involving 'schema.js'. 
        Current Schema references: 
        ScenarioInputSchema: ${typeof ScenarioInputSchema}
        CalculationResultSchema: ${typeof CalculationResultSchema}`;
        console.error(msg);
        throw new Error(msg);
    }

    let safeInput;
    try {
        safeInput = ScenarioInputSchema.parse(input);
    } catch (e) {
        console.error("Zod Validation Failed:", JSON.stringify(e.format ? e.format() : e, null, 2));
        // Throw a descriptive error to stop execution but allow UI to handle boundaries
        throw new Error(`Input Validation Failed: ${e.message}`);
    }
    const { project, massing, basement, bonus } = safeInput;

    if (!project || !project.land_parcels) {
        throw new Error("Invalid project data");
    }

    // 73: Helper to calc capacity for a list of parcels (Robust)
    const allParcels = project.land_parcels || [];
    // [Fix] Site Area Source of Truth
    // Priority: Project Site Config > Project Site > Explicit List
    // But computeScenario input is 'ScenarioInputSchema' -> 'project'
    // 'project' has 'site' schema. 'site_config' is also there.
    const rawSelectedIds = project.site_config?.selectedParcelIds ?? project.site?.selectedParcelIds ?? [];
    const selectedIds = new Set(rawSelectedIds.map(String));

    // Resolve In-Site Parcels
    // Filter: Must be 'include_in_site' (if flag exists) AND in selected list
    // Note: input.project.land_parcels is source.
    let activeParcels = allParcels;
    if (selectedIds.size > 0) {
        activeParcels = allParcels.filter(p => selectedIds.has(String(p.id)));
    } else {
        // Fallback or Empty?
        // User requirements: "If no parcels selected, siteArea can be 0 but must not throw."
        // Also "if project.site is missing...".
        // Let's assume if explicit empty set -> 0. If undefined -> all? matches previous logic?
        // User Logic: "const selectedIds = ...; if (selectedIds.size === 0 || selectedIds.has(...))"
        // Wait, user logic "selectedIds.size === 0 || selectedIds.has(String(p.id))" implies if empty selection, SELECT ALL?
        // Or "filter(p => ... selectedIds.has(...) )".
        // Let's stick to my robust block which handles it.
        if (project.site?.selectedParcelIds) {
            // Explicit empty array means 0.
            activeParcels = [];
        } else {
            // Undefined means All
            activeParcels = allParcels;
        }
    }

    // User logic "const inSite = parcels.filter(p => (p.include_in_site === true) && (selectedIds.size === 0 || selectedIds.has(String(p.id))))"
    // This logic implies "include_in_site" is a flag on parcel.
    // And if selectedIds is empty, it selects everything that has include_in_site=true.
    // Let's Implement exactly that to match user request B.

    const uSelectedIds = new Set((project.site_config?.selectedParcelIds ?? project.site?.selectedParcelIds ?? []).map(String));
    activeParcels = allParcels.filter(p =>
        (p.include_in_site !== false) && // Default true
        (uSelectedIds.size === 0 || uSelectedIds.has(String(p.id)))
    );

    const calcCapacity = (list) => list.reduce((sum, p) => {
        const limitRate = (p.farLimit !== null && p.farLimit !== undefined) ? Number(p.farLimit) : Number(p.legal_floor_area_rate || 0);
        return sum + (Number(p.area_m2 || 0) * (limitRate / 100));
    }, 0);

    // Calculate Site Area (Sum of active parcels)
    const siteArea = activeParcels.reduce((sum, p) => sum + Number(p.area_m2 || 0), 0);

    const baseVolumeAll = calcCapacity(allParcels);
    const baseVolumeSite = calcCapacity(activeParcels);

    // [DEBUG] MaxGFA Candidates (User Request)
    console.debug("[VB] maxGfa candidates:", {
        baseVolumeAll,
        baseVolumeSite,
        selectedIdsCount: selectedIds.length,
        allParcelsCount: allParcels.length,
        parcels: allParcels.map(p => ({ id: p.id, area: p.area_m2, rate: p.legal_floor_area_rate }))
    });

    const baseVolume = baseVolumeSite; // Use Site Volume for Bonus

    // 3. Bonus Calculation
    const bonusResult = calculateBonus(bonus, baseVolume);

    // 4. Massing Calculation
    const massingResult = calculateMassing(baseVolume, bonusResult.totalAllowedRate, massing, siteArea);

    // 5. Basement Calculation
    // Auto-calculate legal parking if not manually specified (0)
    if ((basement.legal_parking || 0) === 0) {
        // Simple heuristic based on GFA (approximate)
        // Note: For precise calc, we need usage split in GFA. 
        // Using massingResult.usageAreas
        // Residential: 1 space / 120m2, Commercial: 1/100, Agency: 1/140 (approx)
        const { residential, commercial, agency } = massingResult.usageAreas;
        // Re-calculate GFA for usage types based on GFA_NoBalcony (which usageAreas are derived from)

        basement.legal_parking = Math.ceil(
            (residential / 150) + (commercial / 100) + (agency / 100)
        ) || 1; // Fallback to 1 to avoid /0 for layout
    }

    // Also auto-calc motorcycle
    if ((basement.legal_motorcycle || 0) === 0) {
        basement.legal_motorcycle = Math.ceil(massingResult.massingGFA_NoBalcony / 100) || 1;
    }

    const basementResult = calculateBasement(siteArea, basement);

    // 5.5 Site Statistics (Integrated Domain Logic)
    // const allParcels declared above
    const parcelStats = [];

    // A. Calculate Baseline for ALL parcels (for display in table)
    allParcels.forEach(p => {
        const baseline = calculateParcelBaseline(p);
        parcelStats.push({
            id: String(p.id),
            ...baseline
        });
    });

    // B. Site Outcome
    // Filter active parcels based on selectedIds in site config
    // If selectedParcelIds is empty, we return empty state (as per requirement)
    // Note: If selectedParcelIds is undefined/empty but we have parcels, should we default to ALL?
    // Requirement: "若 site.selectedParcelIds 為空：site 計算輸出空狀態"
    // const selectedIds declared above
    const mixedZonePolicy = project.site?.mixedZonePolicy || 'weightedAverage';
    const allocation = project.site?.allocation || {};

    let siteOutcome = {
        maxFootprint: 0,
        maxGfa: 0,
        zoneBreakdown: {},
        validations: [],
        totalSiteArea: 0
    };

    if (selectedIds.length > 0) {
        // Map ID string to Parcel Object
        // Also ensure we only include parcels that exist
        const activeParcels = allParcels
            .filter(p => selectedIds.includes(String(p.id)))
            .map(p => ({ ...p, includeInSite: true })); // Force include for calc

        siteOutcome = calculateSiteOutcome(activeParcels, mixedZonePolicy, allocation);
    }

    const { maxFootprint, maxGfa: calcMaxGFA, zoneBreakdown, validations, totalSiteArea: calcSiteArea } = siteOutcome;

    // Cross-check: The previous 'baseVolume' was Legal Capacity. 
    // 'maxGfa' is the Site Limit (FAR based).
    // gfaDiff = baseVolume - maxGfa (if maxGfa is relevant)

    // Note: baseVolume (Legal Capacity) calculated earlier uses 'legal_floor_area_rate' from zoning.
    // 'maxGfa' here uses 'farLimit' from parcel overrides.
    // They are semantically different.
    // baseVolume = 法定容積 (Zoning * Area)
    // maxGfa = 容積上限 (Override * Area)

    const gfaDiff = baseVolume - calcMaxGFA;
    const isDiffWarning = calcMaxGFA > 0 && Math.abs(gfaDiff) > Math.max(1, baseVolume * 0.005);

    const siteStats = {
        count: selectedIds.length,
        totalArea: calcSiteArea,
        totalAllowedGFA: baseVolume, // Keep original zoning-based calc for reference? Or re-calc based on selection?
        // Requirement says "Total Allowed GFA" is usually strictly zoning. 
        // But if we select subset of parcels, baseVolume should matches subset?
        // 'baseVolume' above was calculated on ALL parcels?
        // Let's check line 66: project.land_parcels.reduce...
        // If we only selected a subset, baseVolume should probably reflect that subset?
        // But UI separation: "Land Parcels" table shows all. "Site" shows selection.
        // Let's assume siteStats.totalAllowedGFA should be for the SITE (selection).
        // I should re-calculate baseVolume for the selection to be consistent.

        maxBuildingArea: maxFootprint,
        maxGFA: calcMaxGFA,
        gfaDiff,
        isDiffWarning,

        policy: mixedZonePolicy,
        zoneBreakdown,
        validations
    };

    // Re-calc baseVolume for Site Context specifically? 
    // The top-level 'baseVolume' is often used for Bonus calculation basis.
    // If user selects only 2 of 3 parcels, Bonus should apply to 2?
    // User requirement implies "Site" is the Calculation Unit.
    // So 'baseVolume' should probably match 'selectedIds'.
    // However, changing 'baseVolume' might affect previous logic if not careful.
    // In strict integration, we should probably follow the Site Selection.

    // Let's adjust totalAllowedGFA in siteStats to match selected subset:
    if (selectedIds.length > 0) {
        siteStats.totalAllowedGFA = allParcels
            .filter(p => selectedIds.includes(String(p.id)))
            .reduce((sum, p) => sum + (Number(p.area_m2 || 0) * (Number(p.legal_floor_area_rate || 0) / 100)), 0);
    } else {
        siteStats.totalAllowedGFA = 0;
    }


    // 6. Construct Result
    const result = {
        baseVolume,
        siteArea,
        siteStats, // Integrated
        parcelStats, // Per-parcel baseline
        bonus: bonusResult,
        massing: massingResult,
        basement: basementResult,
        audit: AUDIT_SOURCES,
        snapshot: {
            calculationVersion: "1.0.0",
            timestamp: new Date().toISOString(),
            inputHash: computeObjectHash(safeInput)
        }
    };

    // 7. Validate Output
    return CalculationResultSchema.parse(result);
};
