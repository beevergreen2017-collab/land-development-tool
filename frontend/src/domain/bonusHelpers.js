export const toNum = (v, fallback = 0) => {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : fallback;
};

export const fmtFixed = (v, digits = 2, fallback = "0.00") => {
    const n = toNum(v, NaN);
    return Number.isFinite(n) ? n.toFixed(digits) : fallback;
};

export const normalizeTodDetails = (project, todConfig) => {
    const rawDetails = project?.tod_increment_bonus_details || {};
    // Ensure we have a valid object structure
    const safeDetails = typeof rawDetails === 'object' && rawDetails !== null ? rawDetails : {};

    // Check for critical config availability
    const criteriaMissing = !todConfig;
    const stations = todConfig?.stations || [];

    // Normalize specific fields if necessary (though the generic structure is mostly JSON)
    // We want to return a derived state object that the UI can consume safely.
    // However, since UI reads from 'checklist' style draft, we might just want to backfill defaults.

    // For specific requirement "stations check":
    // If the data structure inside is 'checklist', we ensure specific keys are numbers.
    const checklist = safeDetails.checklist || {};

    // Safely parse checklist numbers
    const d1 = toNum(checklist.d1_station_r);
    const d2 = toNum(checklist.d2_transfer_r);
    const d3 = toNum(checklist.d3_scale_r);
    const d4 = toNum(checklist.d4_design_r);
    const d5 = toNum(checklist.d5_park_r);

    return {
        // Original structure preserved
        ...safeDetails,
        // Enforce checklist existence with normalized numbers if accessed directly
        checklist: {
            ...checklist,
            d1_station_r: d1,
            d2_transfer_r: d2,
            d3_scale_r: d3,
            d4_design_r: d4,
            d5_park_r: d5,
        },
        // Meta information for UI
        meta: {
            criteriaMissing,
            availableStations: stations.length,
            missingKeys: criteriaMissing ? ['TOD_CONFIG'] : []
        }
    };
};
