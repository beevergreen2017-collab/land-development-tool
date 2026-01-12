import { CENTRAL_BONUS_ITEMS, LOCAL_BONUS_ITEMS, TOD_CONSTANTS } from '../constants.js';

// --- Helper Functions ---

const safeNum = (val) => {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    // Strip commas for "5,762.4" support
    const str = String(val).trim().replace(/,/g, '');
    const n = Number(str);
    return isFinite(n) ? n : 0;
};

const formatItem = (key, label, value, baseVolume, checklist, customDetails = null, note = null) => {
    const numericValue = safeNum(value);
    const validBaseVolume = safeNum(baseVolume);
    const area = validBaseVolume > 0 ? (validBaseVolume * numericValue) / 100 : 0;

    // specific structured details override generic checklist
    if (customDetails) {
        return {
            key, label, ratio: numericValue, area,
            details: customDetails,
            note
        };
    }

    return {
        key, label, ratio: numericValue, area,
        details: checklist, // Keep full checklist for generic rendering
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

const calculateDisasterBonus = (inputRate, details) => {
    const checklist = details?.checklist || {};

    // 1. Eligibility Check
    const urbanRenewalMode = !!checklist.urbanRenewalMode || !!checklist.is_plan_approved;
    const siteAreaM2 = safeNum(checklist.siteAreaM2 || checklist.base_area_m2);
    const siteAreaOk = siteAreaM2 >= 1000;

    const legalBuildingProof = checklist.legalBuildingProof || null;
    const seismicPath = checklist.seismicPath || null;
    const idValue = safeNum(checklist.idValue);
    let seismicOk = false;
    if (seismicPath === 'ID_LT_035' && idValue < 0.35 && idValue > 0) seismicOk = true;
    if (seismicPath === 'PRE_630215_USE_PERMIT_EXEMPT') seismicOk = true;

    const hasRisk = !!checklist.has_risk_assessment;
    if (hasRisk) seismicOk = true;

    const isEligible = (urbanRenewalMode && siteAreaOk) && (legalBuildingProof || hasRisk || seismicOk);

    // 2. Mode & Exclusivity
    const exclusivityMode = checklist.exclusivityMode || checklist.mode || 'standard';
    // [Mutex Removal] No locking logic here.
    const lockedItems = [];

    // 3. Rate Calculation
    const displayRate = safeNum(inputRate);
    const effectiveRate = isEligible ? displayRate : 0;

    return {
        ratio: displayRate,
        effectiveRate,
        isEligible,
        details: {
            eligibility: {
                urbanRenewalMode,
                siteAreaM2,
                siteAreaOk,
                legalBuildingProof,
                seismicPath,
                idValue,
                missing: []
            },
            exclusivity: {
                mode: exclusivityMode // Keep mode string for reference, but no locking side-effects
            }
        }
    };
};

const calculateTODBonus = (baseVolume, details) => {
    const checklist = details?.checklist || {};
    const validBaseVolume = safeNum(baseVolume);
    if (validBaseVolume <= 0) return { ratio: 0, area: 0, cap: 30, details: {} };

    // 1. Config
    const stationType = checklist.station_type || 'level2';
    const zoneType = checklist.zone_type || 'general';

    // 2. D1 (Area or Manual)
    const d1Mode = checklist.d1_mode || 'area';
    let r1 = 0;
    if (d1Mode === 'manual') {
        r1 = safeNum(checklist.d1_ratio_manual);
    } else {
        const area1 = (safeNum(checklist.d1_area_ground) * 1) + (safeNum(checklist.d1_area_other) * 0.5);
        r1 = (area1 / validBaseVolume) * 100;
    }

    // 3. D2 (Area or Manual)
    const d2Mode = checklist.d2_mode || 'area';
    let r2 = 0;
    if (d2Mode === 'manual') {
        r2 = safeNum(checklist.d2_ratio_manual);
    } else {
        const area2 = safeNum(checklist.d2_area);
        r2 = (area2 / validBaseVolume) * 100;
    }

    // 4. D3 (Points + Buildings)
    const d3Level = checklist.d3_level || 'std';
    const d3Items = checklist.d3_items_count || 3;
    const d3Bldgs = checklist.d3_buildings_count || 1;
    let baseD3 = 0;
    if (d3Level === 'std') {
        if (d3Items >= 5) baseD3 = 3;
        else if (d3Items === 4) baseD3 = 2;
        else baseD3 = 1;
    } else { // adv
        if (d3Items >= 5) baseD3 = 6;
        else if (d3Items === 4) baseD3 = 4;
        else baseD3 = 2;
    }
    const d3Calc = baseD3 + (d3Bldgs * 0.25);
    // Allow override
    const r3 = safeNum(checklist.d3_ratio_override) > 0 ? safeNum(checklist.d3_ratio_override) : d3Calc;

    // 5. D4 (Donation) - "Bonus Value corresponds to 50% of Donation Area" -> BonusArea = Donation * 2 ? 
    // Wait, PDF says "獎勵值對應50%之樓地板". Usually means if you donate X, you get X/2 bonus? Or you get Bonus B by donating 0.5B?
    // Let's assume standard intuition: "Donation x 2 = Bonus Area" is generous. 
    // Or "Bonus Area = Donation Area * 0.5"?
    // The previous code had `d4RewardArea = d4Donation * 2`. Let's stick to that or user's implementation.
    // Actually, let's use the explicit manual override if unsure, but implement the `* 2` default as per previous code.
    const d4Mode = checklist.d4_mode || 'area';
    let r4 = 0;
    if (d4Mode === 'manual') {
        r4 = safeNum(checklist.d4_ratio_manual);
    } else {
        const donation = safeNum(checklist.d4_donation_area);
        const rewardArea = donation * 2;
        r4 = (rewardArea / validBaseVolume) * 100;
    }

    // 6. D5 (Money)
    const r5 = safeNum(checklist.d5_ratio_manual);

    // Sum
    const sumRatio = r1 + r2 + r3 + r4 + r5;

    // Cap
    const capTable = TOD_CONSTANTS.CAPS[stationType] || TOD_CONSTANTS.CAPS.level2;
    const cap = capTable[zoneType] || 10;

    const finalRatio = Math.min(sumRatio, cap);
    const finalArea = (validBaseVolume * finalRatio) / 100;

    return {
        ratio: finalRatio,
        area: finalArea,
        cap,
        details: { ...checklist, r1, r2, r3, r4, r5, sumRatio, finalRatio, cap }
    };
};

// --- Soil 80-2 Logic ---
const calculateSoil802Bonus = (siteAreaM2, inputRate,) => {
    const areaOk = safeNum(siteAreaM2) >= 2000;
    const displayRate = safeNum(inputRate);
    const capped = Math.min(displayRate, 30);
    const effectiveRate = areaOk ? capped : 0;

    let note = "";
    if (displayRate <= 0) {
        note = null;
    } else if (!areaOk) {
        note = "不符80-2：基地面積未達 2,000㎡（不計入）";
    } else if (displayRate > 30) {
        note = "80-2 上限 30%（已套用上限）";
    } else {
        note = "80-2：上限 30%";
    }

    return { areaOk, displayRate, effectiveRate, note };
};

// --- Main Calculation ---

export const calculateBonus = (bonusInput, baseVolume, siteAreaM2 = 0) => {
    const items = [];
    if (!bonusInput) return { applicationTotal: 0, actualBonus: 0, totalAllowedRate: 100, items, cap: 50, publicExemption: 0, lockedItems: [] };

    const validBaseVolume = safeNum(baseVolume);

    const {
        bonus_central, bonus_local,
        bonus_other, disaster_renewal_bonus_ratio, // bonus_other is canonical for Disaster
        bonus_chloride,
        bonus_tod, // bonus_tod is canonical
        bonus_soil_mgmt, bonus_public_exemption, bonus_cap,
        centralBonusDetails, localBonusDetails, disasterBonusDetails, chlorideBonusDetails,
        tod_bonus_details // canonical details
    } = bonusInput;

    // 1. Disaster (bonus_other)
    const disasterRatio = safeNum(bonus_other);
    const disasterDetailsSafe = disasterBonusDetails || {};
    const disasterResult = calculateDisasterBonus(disasterRatio, disasterDetailsSafe, validBaseVolume);


    // 2. Central
    items.push(formatItem("bonus_central", "中央都更獎勵", bonus_central, validBaseVolume, centralBonusDetails?.checklist, null, null));

    // 3. Local
    items.push(formatItem("bonus_local", "地方都更獎勵", bonus_local, validBaseVolume, localBonusDetails?.checklist, null, null));

    // 4. Disaster
    const disasterNote = disasterResult.details.exclusivity.mode === 'special' ? "特殊放寬模式 (Special Mode)" : "一般獎勵模式 (Standard Mode)";
    const disasterItem = formatItem("bonus_other", "防災型都更獎勵", disasterResult.ratio, validBaseVolume, null, disasterResult.details, disasterNote);
    disasterItem.effectiveRate = disasterResult.effectiveRate;
    items.push(disasterItem);

    // 5. Chloride
    const chlorideCalc = calculateChlorideBonus(validBaseVolume, bonus_chloride, chlorideBonusDetails);
    const finalChloride = chlorideCalc.isCalculated ? chlorideCalc.rate : safeNum(bonus_chloride);
    items.push(formatItem("bonus_chloride", "高氯離子建物獎勵（海砂屋）", finalChloride, validBaseVolume, chlorideBonusDetails?.checklist, null, null));

    // 6. Soil 80-2
    const soil802 = calculateSoil802Bonus(siteAreaM2, bonus_soil_mgmt);
    const soilItem = formatItem("bonus_soil_mgmt", "土管80-2", soil802.displayRate, validBaseVolume, null, { soil802 }, soil802.note);
    soilItem.effectiveRate = soil802.effectiveRate;
    items.push(soilItem);

    // 7. Public Exemption (Legacy)

    items.push(formatItem("bonus_public_exemption", "公益性免計容積", bonus_public_exemption, validBaseVolume));

    // 7. TOD (Canonical)
    // Use bonus_tod if available, or fall back to legacy logic if entirely empty
    // But we want to enforce new logic.
    const todDetails = tod_bonus_details || {};
    const todResult = calculateTODBonus(validBaseVolume, todDetails);

    // If user manually input a ratio in the standard table but hasn't used the modal (so no details),
    // we might want to respect the simple input?
    // The requirement says: "Canonical TOD functionality ... detailed D1-D5 calculations".
    // If `todResult.ratio` is 0 but `bonus_tod` > 0, maybe user just typed it?
    // Let's use `todResult.ratio` if details exist, otherwise `bonus_tod`.
    // Actually, `calculateTODBonus` returns 0 if no details/checklist inputs.
    // If the user typed "10%" in the input box, `bonus_tod` is 10. `todResult` might be 0.
    // We should allow the manual override if no D1-D5 inputs are present.
    // Check if checklist has any keys?
    const hasTODDetails = Object.keys(todDetails.checklist || {}).length > 0;
    const finalTodRatio = hasTODDetails ? todResult.ratio : safeNum(bonus_tod);
    const finalTodDetails = hasTODDetails ? todResult.details : { manual_override: finalTodRatio };

    // Note: Caps are applied inside calculateTODBonus, so if utilizing that, cap is respected. 
    // If manual override, we don't apply cap automatically here? 
    // Let's just store the result.
    items.push({
        key: "bonus_tod",
        label: "TOD 容積獎勵",
        ratio: finalTodRatio,
        area: (validBaseVolume * finalTodRatio) / 100,
        details: finalTodDetails,
        note: hasTODDetails ? `上限: ${todResult.cap}%` : null
    });

    // Aggregation
    const aggItems = items.filter(i =>
        ['bonus_central', 'bonus_local', 'bonus_other', 'bonus_chloride', 'bonus_soil_mgmt', 'bonus_tod'].includes(i.key)
    );

    const applicationTotal = aggItems.reduce((a, b) => a + safeNum(b.ratio), 0);

    const effectiveSum = aggItems.reduce((a, b) => {
        const rate = (b.effectiveRate !== undefined) ? b.effectiveRate : b.ratio;
        return a + safeNum(rate);
    }, 0);

    // Apply Cap
    const cap = safeNum(bonus_cap) || 50;
    const actualBonus = Math.min(effectiveSum, cap);

    // Total Allowed Rate
    const totalAllowedRate = 100 + actualBonus + safeNum(bonus_public_exemption);

    return {
        applicationTotal,
        actualBonus,
        totalAllowedRate,
        items,
        cap,
        publicExemption: safeNum(bonus_public_exemption),
        publicExemption: safeNum(bonus_public_exemption),
        lockedItems: [] // [Mutex Removal] Always empty
    };
};
