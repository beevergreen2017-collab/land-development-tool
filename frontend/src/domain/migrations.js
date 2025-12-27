
// MIGRATION STRATEGY: Frontend-side Normalization (Strategy 2)
// 
// This file handles schema evolution for bonus details.
// It ensures that:
// 1. Missing keys (new features) are backfilled with defaults.
// 2. Renamed keys (refactoring) are mapped correctly (preserving old data).
// 3. The UI never crashes due to undefined objects.

// --- CONFIGURATION ---

// Define Renames Here: { 'scope_name': { 'old_key': 'new_key' } }
// Example: If you renamed 'solar_panels' to 'green_energy' in CENTRAL_BONUS_ITEMS
const LEGACY_KEY_MAPPINGS = {
    'central_bonus_details': {
        // 'old_unwanted_key': 'new_shiny_key' 
    },
    'local_bonus_details': {},
    'disaster_bonus_details': {
        'urbanRenewalMode': 'is_plan_approved',
        'siteAreaM2': 'base_area_m2',
        'risk_check': 'has_risk_assessment'
    },
    'chloride_bonus_details': {}
};

// --- LOGIC ---

/**
 * Normalizes bonus details payload to ensure it matches current schema.
 * @param {Object|null} persistedData - The raw JSON from DB/LocalStorage
 * @param {Object} configItems - The current definitions from constants.js (Source of Truth)
 * @param {String} scopeKey - The key used in LEGACY_KEY_MAPPINGS (e.g. 'central_bonus_details')
 * @returns {Object} A safe, fully hydrated object: { enabled: bool, checklist: {}, calculation_mode: str }
 */
export const normalizeBonusDetails = (persistedData, configItems, scopeKey = null) => {
    // 1. Safety & Default Structure
    const safeData = persistedData || {};
    const safeChecklist = safeData.checklist || {};

    // Clone to avoid mutation
    const normalizedChecklist = { ...safeChecklist };

    // 2. Apply Renames (Migration)
    if (scopeKey && LEGACY_KEY_MAPPINGS[scopeKey]) {
        const mapping = LEGACY_KEY_MAPPINGS[scopeKey];
        Object.entries(mapping).forEach(([oldKey, newKey]) => {
            // If old key exists and new key doesn't
            if (normalizedChecklist[oldKey] !== undefined && normalizedChecklist[newKey] === undefined) {
                console.log(`[Schema Migration] Migrating ${scopeKey}: ${oldKey} -> ${newKey}`);
                normalizedChecklist[newKey] = normalizedChecklist[oldKey];
                // We keep the old key in case of rollback? 
                // No, standard migration usually cleans up to avoid confusion.
                delete normalizedChecklist[oldKey];
            }
        });
    }

    // 3. Backfill Defaults (Schema Evolution)
    // Ensures new items in constants.js appear in the state immediately
    if (configItems) {
        Object.entries(configItems).forEach(([key, cfg]) => {
            if (normalizedChecklist[key] === undefined) {
                console.warn(`[Auto-Recovery] Missing key '${key}' in '${scopeKey}'. Backfilling default.`);
                // Determine sensible default based on type
                if (cfg.type === 'input') normalizedChecklist[key] = cfg.defaultValue ?? 0;
                else if (cfg.type === 'checkbox') normalizedChecklist[key] = cfg.defaultValue ?? false;
                else if (cfg.type === 'radio') normalizedChecklist[key] = cfg.defaultValue ?? 0;
                else normalizedChecklist[key] = 0;
            }
        });
    }

    return {
        enabled: safeData.enabled ?? true, // Default to Enabled
        calculation_mode: safeData.calculation_mode ?? 'allowed_gfa',
        checklist: normalizedChecklist
    };
};

/**
 * Global Migration helper to clean up the entire bonus map (called before individual normalizations or after)
 * @param {Object} bonusMap - The full bonus.details map
 */
export const migrateGlobalBonusMap = (bonusMap) => {
    if (!bonusMap) return {};
    const safeMap = { ...bonusMap };

    // 1. TOD Consolidation: Legacy -> Canonical 'bonus_tod'
    // Map 'bonus_tod_increment' (old 80-2 user input) to 'bonus_tod' if 'bonus_tod' is empty
    if (safeMap.bonus_tod_increment !== undefined) {
        if (!safeMap.bonus_tod) safeMap.bonus_tod = safeMap.bonus_tod_increment;
        delete safeMap.bonus_tod_increment;
    }
    // Delete 'bonus_tod_reward' (old concept)
    if (safeMap.bonus_tod_reward !== undefined) delete safeMap.bonus_tod_reward;

    // Details migration: todIncrementBonusDetails -> tod_bonus_details
    if (safeMap.todIncrementBonusDetails) {
        if (!safeMap.tod_bonus_details) safeMap.tod_bonus_details = safeMap.todIncrementBonusDetails;
        delete safeMap.todIncrementBonusDetails;
    }
    // Delete todRewardBonusDetails
    if (safeMap.todRewardBonusDetails) delete safeMap.todRewardBonusDetails;

    return safeMap;
};
