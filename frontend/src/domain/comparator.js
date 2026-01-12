/**
 * Scenario Comparison Engine
 * Compares two CalculationResult snapshots used for decision support.
 */

export const compareResults = (base, target) => {
    if (!base || !target) return { valid: false, error: "Missing result data" };

    // 1. Version Check
    const baseVer = base.snapshot?.calculationVersion || "unknown";
    const targetVer = target.snapshot?.calculationVersion || "unknown";

    if (baseVer !== targetVer) {
        return {
            valid: false,
            versionMismatch: true,
            error: `Version mismatch: ${baseVer} vs ${targetVer}`
        };
    }

    // 2. Define Key Metrics to Compare
    const metrics = [
        {
            id: 'gfa',
            label: '總樓地板面積 (GFA)',
            baseVal: base.massing.massingGFA_Total,
            targetVal: target.massing.massingGFA_Total,
            unit: 'm²'
        },
        {
            id: 'far',
            label: '允建容積 (Allowed Vol)',
            baseVal: base.massing.allowedVolumeArea,
            targetVal: target.massing.allowedVolumeArea,
            unit: 'm²'
        },
        {
            id: 'floors',
            label: '預估樓層 (Floors)',
            baseVal: base.massing.estFloors,
            targetVal: target.massing.estFloors,
            unit: 'F'
        },
        {
            id: 'parking',
            label: '總車位 (Parking)',
            baseVal: base.basement.calcTotalParking,
            targetVal: target.basement.calcTotalParking,
            unit: '輛'
        },
        {
            id: 'depth',
            label: '開挖深度 (Depth)',
            baseVal: base.basement.totalExcavationDepth,
            targetVal: target.basement.totalExcavationDepth,
            unit: 'm'
        }
    ];

    // 3. Compute Deltas
    const deltas = metrics.map(m => {
        const delta = m.targetVal - m.baseVal;
        let deltaPercent = 0;
        if (m.baseVal !== 0) {
            deltaPercent = (delta / m.baseVal) * 100;
        }

        return {
            ...m,
            delta,
            deltaPercent
        };
    });

    return {
        valid: true,
        versionMismatch: false,
        deltas
    };
};
