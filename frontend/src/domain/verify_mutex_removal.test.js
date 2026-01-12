import { describe, it, expect } from 'vitest';
import { computeScenario } from './computeScenario';
import { SITE_POLICY } from './constants';

// --- Mock Helpers (Copied from computeScenario.test.js for stability) ---
const createProject = (overrides = {}) => {
    const defaultParcel = {
        id: 'parcel-1',
        district: 'Test District',
        section_name: 'Test Section',
        lot_number: '123',
        area_m2: 1000,
        zoning_type: 'Residential',
        legal_coverage_rate: 60,
        legal_floor_area_rate: 240,
        road_width: 8,
        bcrLimit: null,
        farLimit: null,
        ownershipStatus: 'unknown',
        integrationRisk: 'unknown',
        includeInSite: true
    };

    return {
        id: 'test-proj-001',
        name: 'Test Scenario Project',
        bcr: 60,
        far: 240,
        site: {
            selectedParcelIds: ['parcel-1'],
            mixedZonePolicy: SITE_POLICY.WEIGHTED,
            allocation: {},
            ...overrides.site
        },
        land_parcels: [defaultParcel],
        ...overrides
    };
};

const createBonus = (overrides = {}) => ({
    bonus_central: 0.0,
    bonus_local: 0.0,
    bonus_other: 0.0,
    bonus_chloride: 0.0,
    bonus_soil_mgmt: 0.0,
    bonus_tod: 0.0,
    bonus_public_exemption: 0.0,
    bonus_cap: 100.0,
    centralBonusDetails: { checklist: {}, enabled: true, calculation_mode: 'allowed_gfa' },
    localBonusDetails: { checklist: {}, enabled: true, calculation_mode: 'allowed_gfa' },
    disasterBonusDetails: { checklist: {}, enabled: true, calculation_mode: 'allowed_gfa' },
    ...overrides
});

// --- Test Suite ---

describe('Mutex Removal Verification', () => {
    it('should stack Disaster Special Mode with Central and Local bonuses', () => {
        const input = {
            project: createProject({ base_far: 200 }),
            massing: {}, // Empty is generally allowed if optional, but let's provide minimal if needed
            basement: {},
            bonus: createBonus({
                bonus_other: 20.0, // Disaster Risk
                disasterBonusDetails: {
                    enabled: true,
                    checklist: {
                        exclusivityMode: 'special',
                        is_plan_approved: true,
                        base_area_m2: 1500,
                        has_risk_assessment: true
                    }
                },
                bonus_central: 10.0,
                bonus_local: 5.0,
                bonus_tod: 15.0
            })
        };

        let result;
        try {
            result = computeScenario(input);
        } catch (error) {
            console.error("COMPUTE ERROR:", error);
            if (error.errors) {
                console.error("ZOD DETAILS:", JSON.stringify(error.errors, null, 2));
            }
            throw error;
        }

        // Assertions
        // lockedItems should be undefined or empty.
        expect(result.bonus.lockedItems || []).toEqual([]);


        const central = result.bonus.items.find(i => i.key === 'bonus_central');
        expect(central.ratio).toBe(10.0);
        expect(central.note).toBeFalsy();

        const local = result.bonus.items.find(i => i.key === 'bonus_local');
        expect(local.ratio).toBe(5.0);

        const disasters = result.bonus.items.find(i => i.key === 'bonus_other');
        expect(disasters.ratio).toBe(20.0);

        const tod = result.bonus.items.find(i => i.key === 'bonus_tod');
        expect(tod.ratio).toBe(15.0);

        // Sum: 20 + 10 + 5 + 15 = 50%
        expect(result.bonus.applicationTotal).toBe(50.0);
    });
});
