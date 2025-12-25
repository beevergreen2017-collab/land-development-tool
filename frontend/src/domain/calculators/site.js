import { SITE_POLICY } from '../constants.js';

/**
 * Calculate baseline limits for a single parcel.
 * @param {Object} parcel - LandParcel object
 * @returns {Object} { maxFootprint, maxGfa, warnings: [] }
 */
export const calculateParcelBaseline = (parcel) => {
    const { area_m2, bcrLimit, farLimit, zoning_type } = parcel;
    const warnings = [];

    // Validate Inputs (Return nulls if limits are missing)
    if (typeof bcrLimit !== 'number') {
        warnings.push({ type: 'warn', path: `parcels.${parcel.id}.bcrLimit`, msg: `Parcel ${parcel.lot_number} missing BCR limit` });
    }
    if (typeof farLimit !== 'number') {
        warnings.push({ type: 'warn', path: `parcels.${parcel.id}.farLimit`, msg: `Parcel ${parcel.lot_number} missing FAR limit` });
    }

    const maxFootprint = (typeof bcrLimit === 'number' && area_m2 > 0) ? (area_m2 * bcrLimit / 100) : null;
    const maxGfa = (typeof farLimit === 'number' && area_m2 > 0) ? (area_m2 * farLimit / 100) : null;

    return { maxFootprint, maxGfa, warnings };
};

/**
 * Aggregate parcels into zoning breakdown.
 * @param {Array} parcels 
 * @returns {Object} breakdown map keyed by zoning_type
 */
const getZoneBreakdown = (parcels) => {
    const breakdown = {};
    parcels.forEach(p => {
        if (!p.includeInSite) return;

        const zone = p.zoning_type || 'Unknown';
        if (!breakdown[zone]) {
            breakdown[zone] = {
                zone,
                totalArea: 0,
                totalMaxFootprint: 0,
                totalMaxGfa: 0,
                parcels: [],
                bcrLimit: p.bcrLimit, // Assume homogeneous zone props for now, or detect conflict?
                farLimit: p.farLimit
            };
        }

        const { maxFootprint, maxGfa } = calculateParcelBaseline(p);

        breakdown[zone].totalArea += (p.area_m2 || 0);
        breakdown[zone].totalMaxFootprint += (maxFootprint || 0);
        breakdown[zone].totalMaxGfa += (maxGfa || 0);
        breakdown[zone].parcels.push(p);
    });
    return breakdown;
};

/**
 * Calculate Site Outcome based on Policy.
 * @param {Array} parcels 
 * @param {string} policy - ONE of SITE_POLICY enum
 * @param {Object} allocation - Optional input for Cap by Zone (resCapGfa etc)
 * @returns {Object} { maxFootprint, maxGfa, zoneBreakdown, validations }
 */
export const calculateSiteOutcome = (parcels, policy, allocation = {}) => {
    const activeParcels = parcels.filter(p => p.includeInSite !== false);
    const validations = [];
    const zoneBreakdown = getZoneBreakdown(activeParcels);
    const zones = Object.values(zoneBreakdown);
    const totalSiteArea = zones.reduce((sum, z) => sum + z.totalArea, 0);

    if (totalSiteArea === 0) {
        return { maxFootprint: 0, maxGfa: 0, zoneBreakdown, validations };
    }

    // 1. Accumulate Parcel Warnings from Breakdown
    zones.forEach(z => {
        if (z.parcels) {
            z.parcels.forEach(p => {
                const { warnings } = calculateParcelBaseline(p);
                validations.push(...warnings);
            });
        }
    });

    // 2. Policy Fallback Check
    let effectivePolicy = policy;
    if (!Object.values(SITE_POLICY).includes(policy)) {
        console.warn(`[SiteCalculator] Invalid/Missing Policy '${policy}'. Defaulting to '${SITE_POLICY.WEIGHTED}'.`);
        validations.push({ type: 'error', msg: `Unknown Policy '${policy}', defaulted to Weighted Average` });
        effectivePolicy = SITE_POLICY.WEIGHTED;
    }

    let siteMaxFootprint = 0;
    let siteMaxGfa = 0;

    switch (effectivePolicy) {
        case SITE_POLICY.WEIGHTED:
            // Mode A: Weighted Average
            siteMaxFootprint = zones.reduce((sum, z) => sum + z.totalMaxFootprint, 0);
            siteMaxGfa = zones.reduce((sum, z) => sum + z.totalMaxGfa, 0);
            break;

        case SITE_POLICY.CAP_BY_ZONE:
            // Mode B: Cap by Zone
            if (allocation.resCapGfa !== undefined || allocation.comCapGfa !== undefined) {
                siteMaxGfa = (allocation.resCapGfa || 0) + (allocation.comCapGfa || 0);
                siteMaxFootprint = zones.reduce((sum, z) => sum + z.totalMaxFootprint, 0);
            } else {
                siteMaxGfa = zones.reduce((sum, z) => sum + z.totalMaxGfa, 0);
                siteMaxFootprint = zones.reduce((sum, z) => sum + z.totalMaxFootprint, 0);
            }
            break;

        case SITE_POLICY.CONSERVATIVE:
            // Mode C: Conservative
            {
                const bcrRates = zones.map(z => z.bcrLimit).filter(r => typeof r === 'number');
                const farRates = zones.map(z => z.farLimit).filter(r => typeof r === 'number');

                const minBcr = bcrRates.length > 0 ? Math.min(...bcrRates) : 0;
                const minFar = farRates.length > 0 ? Math.min(...farRates) : 0;

                siteMaxFootprint = (totalSiteArea * minBcr / 100);
                siteMaxGfa = (totalSiteArea * minFar / 100);
            }
            break;
    }

    // 3. Summarize Validation Errors for UI
    const missingBcrCount = validations.filter(v => v.path && v.path.includes('bcrLimit')).length;
    const missingFarCount = validations.filter(v => v.path && v.path.includes('farLimit')).length;

    const uiValidations = [];
    if (missingBcrCount > 0) uiValidations.push({ type: 'warn', msg: `${missingBcrCount} 筆地號缺少建蔽率 (Missing BCR)` });
    if (missingFarCount > 0) uiValidations.push({ type: 'warn', msg: `${missingFarCount} 筆地號缺少容積率 (Missing FAR)` });
    if (validations.some(v => v.type === 'error')) {
        // Pass through specific errors if any (like policy error)
        validations.filter(v => v.type === 'error').forEach(v => uiValidations.push(v));
    }

    return {
        maxFootprint: siteMaxFootprint,
        maxGfa: siteMaxGfa,
        zoneBreakdown,
        validations: uiValidations, // Return summarized list for UI
        rawWarnings: validations,    // Full detail if needed
        totalSiteArea,
        policy: effectivePolicy      // Echo back what was used
    };
};
