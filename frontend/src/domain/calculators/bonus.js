import { CENTRAL_BONUS_ITEMS, LOCAL_BONUS_ITEMS, DISASTER_BONUS_ITEMS, CHLORIDE_BONUS_ITEMS, TOD_BONUS_ITEMS, TOD_INCREMENT_ITEMS } from '../constants.js';

// --- Helper Functions ---

const safeNum = (val) => {
    if (val === null || val === undefined || isNaN(val)) return 0;
    return Number(val);
};

const formatItem = (key, label, value, baseVolume, checklist, customDetails = null, note = null) => {
    const numericValue = safeNum(value);
    const validBaseVolume = safeNum(baseVolume);
    const area = validBaseVolume > 0 ? (validBaseVolume * numericValue) / 100 : 0;

    // specific structured details override generic checklist
    if (customDetails) {
        return {
            key,
            label,
            ratio: numericValue,
            area,
            details: customDetails,
            isCompliant: numericValue > 0,
            note: note || customDetails?.note
        };
    }

    // Generic Checklist Details
    let details = [];
    if (checklist) {
        details = Object.entries(checklist)
            .filter(([, val]) => val === true || (typeof val === 'number' && val > 0))
            .map(([k, v]) => ({
                id: k,
                label: k,
                value: typeof v === 'number' ? v : 0
            }));
    }

    return {
        key,
        label,
        ratio: numericValue,
        area,
        details, // Array
        isCompliant: numericValue > 0,
        note
    };
};

const calculateChlorideBonus = (baseVolume, input, details) => {
    // If logic: A1, B1 provided -> Calculate Rate
    const checklist = details?.checklist || {};
    if (checklist.calculation_mode === 'original_volume') {
        // mode: A1+B1 or similar
        const a1 = safeNum(checklist.area_ground);
        const b1 = safeNum(checklist.area_underground);
        const sum = a1 + b1;
        const bonusArea = sum * 0.3;
        const rate = baseVolume > 0 ? (bonusArea / baseVolume) * 100 : 0;
        return { rate, area: bonusArea, isCalculated: true };
    }
    return { rate: safeNum(input), area: 0, isCalculated: false };
};

const calculateTODBonus = (input, details) => {
    if (details && details.checklist) {
        const { d1_rate, d2_rate, d3_rate, d4_rate, d5_rate,
            d3_level, d3_items, d3_buildings,
            station_type, zone_type } = details.checklist;

        let d3 = safeNum(d3_rate);

        if (d3 === 0 && d3_level) {
            let base = 0;
            const items = safeNum(d3_items) || 3;
            if (d3_level === 'std') base = (items - 2) * 1.0;
            if (d3_level === 'adv') base = (items - 2) * 2.0;
            const itemScore = Math.min(Math.max(base, 0), d3_level === 'std' ? 3 : 6);
            const bldgScore = (safeNum(d3_buildings) || 1) * 0.25;
            d3 = itemScore + bldgScore;
        }
        const sum = safeNum(d1_rate) + safeNum(d2_rate) + d3 + safeNum(d4_rate) + safeNum(d5_rate);
        const sType = station_type || 'level1';
        const zType = zone_type || 'core';
        const caps = { level1: { core: 30, general: 15 }, level2: { core: 20, general: 10 } };
        const cap = caps[sType]?.[zType] || 30;
        return Math.min(sum, cap);
    }
    return safeNum(input);
};

const calculateDisasterBonus = (inputRate, details) => {
    const checklist = details?.checklist || {};

    // 1. Eligibility Check
    const siteAreaM2 = safeNum(checklist.siteAreaM2);
    const siteAreaOk = siteAreaM2 >= 1000;

    // Checkboxes are often booleans or 'true' strings in some legacy cases, strict compare to true or exist
    const urbanRenewalMode = !!checklist.urbanRenewalMode;
    const legalBuildingProof = checklist.legalBuildingProof || null; // 'usePermit', 'legalProof', 'simplified'

    const seismicPath = checklist.seismicPath || null;
    const idValue = safeNum(checklist.idValue); // ID assessment value

    let seismicOk = false;
    if (seismicPath === 'ID_LT_035' && idValue < 0.35 && idValue > 0) seismicOk = true; // ID < 0.35
    if (seismicPath === 'PRE_630215_USE_PERMIT_EXEMPT') seismicOk = true;

    // Missing list
    const missing = [];
    if (!urbanRenewalMode) missing.push('urbanRenewalMode');
    if (!siteAreaOk) missing.push('siteAreaM2');
    if (!legalBuildingProof) missing.push('legalBuildingProof');
    if (!seismicOk) missing.push('seismicPath');

    const isEligible = urbanRenewalMode && siteAreaOk && !!legalBuildingProof && seismicOk;

    // 2. Mode & Exclusivity
    const exclusivityMode = checklist.exclusivityMode || 'standard'; // 'standard' or 'special'
    let lockOtherBonuses = false;

    if (isEligible && inputRate > 0) {
        if (exclusivityMode === 'special') {
            lockOtherBonuses = true;
        }
        // Standard mode: No lock, but subject to cap
    }

    const lockedItems = [];
    if (lockOtherBonuses) lockedItems.push('bonus_central', 'bonus_local', 'bonus_chloride', 'bonus_tod_reward');

    // 2. Design Requirements (Enums)
    const designRequirements = {
        seismicDesign: checklist.seismicDesign || 'notStarted',
        greenBuilding: checklist.greenBuilding || 'notStarted',
        energyEfficiency1Plus: checklist.energyEfficiency1Plus || 'notStarted',
        smartBuilding: checklist.smartBuilding || 'notStarted',
        permeableAndRunoff: checklist.permeableAndRunoff || 'notStarted',
        accessibleEnv: checklist.accessibleEnv || 'notStarted'
    };

    // 3. Rate Calculation
    // If eligible, allow input Rate (usually up to 30% base or 1.3x原容).
    // Here we respect the inputRate passed from basic bonus logic, but enforce 0 if not eligible.
    // NOTE: Statutory cap check happens in aggregation.
    const finalRate = isEligible ? safeNum(inputRate) : 0;

    // 5. Schedule
    const scheduleAndDeposit = {
        planApprovalDate: checklist.planApprovalDate || null,
        permitDeadlineOk: checklist.permitDeadlineOk || null,
        depositFactor: 0.7,
        depositAmount: null // Could calc if formulas known: (BaseLandVal * Factor * BonusArea...)
    };

    return {
        ratio: finalRate,
        isEligible, // Export for debug
        details: {
            eligibility: {
                urbanRenewalMode,
                siteAreaM2,
                siteAreaOk,
                legalBuildingProof,
                seismicPath,
                idValue,
                consentMeetURAct37: !!checklist.consentMeetURAct37,
                missing
            },
            designRequirements,
            exclusivity: {
                mode: exclusivityMode,
                lockOtherBonuses,
                lockedItems
            },
            scheduleAndDeposit
        }
    };
};

// --- Main Calculation ---

export const calculateBonus = (bonusInput, baseVolume) => {
    if (!bonusInput) return { applicationTotal: 0, actualBonus: 0, totalAllowedRate: 100, items: [], cap: 50, publicExemption: 0 };

    const validBaseVolume = safeNum(baseVolume);

    const {
        bonus_central, bonus_local,
        // [Standardized] Support both new and legacy keys
        bonus_other, disaster_renewal_bonus_ratio,
        bonus_chloride, bonus_tod_reward, bonus_tod_increment,
        bonus_soil_mgmt, bonus_public_exemption, bonus_cap,
        centralBonusDetails, localBonusDetails, disasterBonusDetails, disaster_renewal_bonus_details, chlorideBonusDetails, todRewardBonusDetails, todIncrementBonusDetails
    } = bonusInput;

    // Resolve Disaster Ratio & Details
    // [Fix] Canonical Key 'bonus_other'
    const disasterRatio = safeNum(bonus_other);
    const disasterDetailsSafe = disasterBonusDetails || {}; // Use destructuring from input

    // [DEBUG] Trace Inputs
    console.log("[BonusCalc] Input Trace:", {
        maxGfa: validBaseVolume,
        disaster: {
            val_canonical: disasterRatio,
            details: disasterDetailsSafe
        }
    });

    const disasterResult = calculateDisasterBonus(disasterRatio, disasterDetailsSafe, validBaseVolume);
    const disasterLocked = disasterResult.details.exclusivity.lockOtherBonuses;

    const lockedItems = [];
    if (disasterLocked) lockedItems.push('bonus_central', 'bonus_local', 'bonus_chloride', 'bonus_tod_reward', 'bonus_tod_increment');

    // Helper to zero out if locked
    const applyLock = (key, val) => lockedItems.includes(key) ? 0 : safeNum(val);
    const lockNote = disasterLocked ? "已鎖定 (互斥)" : undefined;

    // 2. Central
    items.push(formatItem("bonus_central", "中央都更獎勵", applyLock('bonus_central', bonus_central), validBaseVolume, centralBonusDetails?.checklist, null, lockedItems.includes('bonus_central') ? lockNote : null));

    // 3. Local
    items.push(formatItem("bonus_local", "地方都更獎勵", applyLock('bonus_local', bonus_local), validBaseVolume, localBonusDetails?.checklist, null, lockedItems.includes('bonus_local') ? lockNote : null));

    // 4. Disaster Item (Using Custom Details)
    const disasterNote = disasterResult.details.exclusivity.mode === 'special' ? "特殊放寬模式 (Special Mode)" : "一般獎勵模式 (Standard Mode)";
    // Key MUST equal 'bonus_other' to match UI table look-up
    items.push(formatItem("bonus_other", "防災型都更獎勵", disasterResult.ratio, validBaseVolume, null, disasterResult.details, disasterNote));

    // 5. Chloride
    const chlorideCalc = calculateChlorideBonus(validBaseVolume, bonus_chloride, chlorideBonusDetails);
    const finalChloride = chlorideCalc.isCalculated ? chlorideCalc.rate : safeNum(bonus_chloride);
    items.push(formatItem("bonus_chloride", "高氯離子建物獎勵（海砂屋）", applyLock('bonus_chloride', finalChloride), validBaseVolume, chlorideBonusDetails?.checklist, null, lockedItems.includes('bonus_chloride') ? lockNote : null));

    // 6. TOD Reward
    const finalTOD = calculateTODBonus(bonus_tod_reward, todRewardBonusDetails);
    // Pass todRewardBonusDetails.checklist so it can be formatted into the details array
    items.push(formatItem("bonus_tod_reward", "TOD 容積獎勵", applyLock('bonus_tod_reward', finalTOD), validBaseVolume, todRewardBonusDetails?.checklist, null, lockedItems.includes('bonus_tod_reward') ? lockNote : null));

    // 7. TOD Increment
    items.push(formatItem("bonus_tod_increment", "TOD 增額容積 (土管80-2)", applyLock('bonus_tod_increment', bonus_tod_increment), validBaseVolume, todIncrementBonusDetails?.checklist, null, lockedItems.includes('bonus_tod_increment') ? lockNote : null));

    items.push(formatItem("bonus_soil_mgmt", "土方管理獎勵", bonus_soil_mgmt, validBaseVolume));
    items.push(formatItem("bonus_public_exemption", "公益性免計容積", bonus_public_exemption, validBaseVolume));

    // --- Aggregation ---
    // Update sumList to include new key
    const sumList = items.filter(i =>
        ['bonus_central', 'bonus_local', 'bonus_other', 'disaster_renewal_bonus_ratio', 'bonus_chloride', 'bonus_tod_reward', 'bonus_soil_mgmt'].includes(i.key)
    ).map(i => i.ratio);

    const applicationTotal = sumList.reduce((a, b) => a + safeNum(b), 0);

    // Apply Cap
    const cap = safeNum(bonus_cap) || 50;
    const actualBonus = Math.min(applicationTotal, cap);

    // Total Allowed Rate
    const totalAllowedRate = 100 + actualBonus + safeNum(bonus_tod_increment) + safeNum(bonus_public_exemption);

    return {
        applicationTotal,
        actualBonus,
        totalAllowedRate,
        items,
        cap,
        publicExemption: safeNum(bonus_public_exemption),
        lockedItems
    };
};
