import { describe, it, expect } from 'vitest';
import { computeScenario } from './computeScenario';
import { SITE_POLICY } from './constants';

// Mock Data Builders
const createProject = (overrides = {}) => {
    const width = overrides.width || 20;
    const depth = overrides.depth || 50;
    const area = width * depth;
    const far = overrides.base_far || 240;
    const bcr = overrides.base_bcr || 60;
    const zoning = overrides.zoning || 'Residential';

    const defaultParcel = {
        id: 'parcel-1',
        district: 'Test District',
        section_name: 'Test Section',
        lot_number: '123',
        area_m2: area,
        zoning_type: zoning,
        legal_coverage_rate: bcr,
        legal_floor_area_rate: far,
        road_width: overrides.road_width || 8,
        bcrLimit: null,
        farLimit: null,
        ownershipStatus: 'unknown',
        integrationRisk: 'unknown',
        includeInSite: true
    };

    return {
        id: 'test-proj-001',
        name: 'Test Scenario Project',
        bcr,
        far,
        site: {
            selectedParcelIds: ['parcel-1'], // Select it by default
            mixedZonePolicy: SITE_POLICY.WEIGHTED,
            allocation: {},
            ...overrides.site
        },
        land_parcels: [defaultParcel],
        ...overrides,
        // cleanup helpers
        width: undefined, depth: undefined, base_bcr: undefined, base_far: undefined, road_width: undefined, zoning: undefined
    };
};

const createMassing = (overrides = {}) => ({
    design_coverage: 45.0,
    exemption_coef: 1.15,
    public_ratio: 33.0,
    me_rate: 15.0,
    stair_rate: 10.0,
    balcony_rate: 5.0,
    residential_rate: 60.0,
    commercial_rate: 30.0,
    agency_rate: 10.0,
    ...overrides
});

const createBasement = (overrides = {}) => ({
    legal_parking: 0,
    bonus_parking: 0,
    excavation_rate: 70.0,
    parking_space_area: 40.0,
    floor_height: 3.3,
    motorcycle_unit_area: 4.0,
    legal_motorcycle: 0,
    ...overrides
});

const createBonus = (overrides = {}) => ({
    bonus_central: 0.0,
    bonus_local: 0.0,
    bonus_other: 0.0,
    bonus_chloride: 0.0,
    bonus_tod_reward: 0.0,
    bonus_tod_increment: 0.0,
    bonus_soil_mgmt: 0.0,
    bonus_tod: 0.0,
    bonus_public_exemption: 0.0,
    bonus_cap: 100.0,
    centralBonusDetails: { checklist: {}, enabled: true, calculation_mode: 'allowed_gfa' },
    localBonusDetails: { checklist: {}, enabled: true, calculation_mode: 'allowed_gfa' },
    disasterBonusDetails: { checklist: {}, enabled: true, calculation_mode: 'allowed_gfa' },
    ...overrides
});

describe('computeScenario Regression Tests', () => {

    // 1. Baseline Scenario
    // Standard Residential project, minimal bonuses.
    it('Scenario 1: Baseline Residential', () => {
        const input = {
            project: createProject({
                width: 30, depth: 33.33, // ~1000m2
                base_bcr: 50, base_far: 200
            }),
            massing: createMassing({
                residential_rate: 100, commercial_rate: 0, agency_rate: 0
            }),
            basement: createBasement(),
            bonus: createBonus({
                bonus_central: 10.0 // 10% bonus
            })
        };

        const result = computeScenario(input);

        // Remove transient field if any (e.g. timestamp) before snapshot
        expect(result).toMatchSnapshot();
    });

    // 2. High Complexity Scenario (Mixed Use, TOD, Transfer)
    // Commercial Zone, Heavy Bonuses, Mixed Use
    it('Scenario 2: Complex Mixed-Use + TOD', () => {
        const input = {
            project: createProject({
                zoning: 'Commercial',
                base_bcr: 60, base_far: 360, // Commercial 2
            }),
            massing: createMassing({
                residential_rate: 50, commercial_rate: 40, agency_rate: 10
            }),
            basement: createBasement({
                excavation_rate: 85.0
            }),
            bonus: createBonus({
                bonus_tod_reward: 15.0,
                bonus_tod_increment: 10.0,
                bonus_cap: 150.0 // Higher Cap
            })
        };

        const result = computeScenario(input);
        expect(result).toMatchSnapshot();
    });

    // 3. Edge Case (Disaster Risk, Small Lot)
    it('Scenario 3: Small Lot with Disaster Bonus', () => {
        const input = {
            project: createProject({
                width: 10, depth: 10, // 100m2 Tiny Lot
                base_bcr: 60, base_far: 240
            }),
            massing: createMassing({
                design_coverage: 55.0 // High coverage
            }),
            basement: createBasement({
                excavation_rate: 90.0 // Max excavation
            }),
            bonus: createBonus({
                bonus_other: 30.0, // Disaster Risk (simulated)
                disasterBonusDetails: { enabled: true, checklist: { 'SC01': true }, calculation_mode: 'allowed_gfa' }
            })
        };

        const result = computeScenario(input);
        expect(result).toMatchSnapshot();
    });
});
