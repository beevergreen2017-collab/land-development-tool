import { computeScenario } from './computeScenario.js';
import { SITE_POLICY } from './constants.js';

// --- Mock Helpers ---
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

// --- Run ---
async function main() {
    try {
        console.log("Preparing input...");
        const input = {
            project: createProject({ base_far: 200 }),
            massing: {},
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

        console.log("Calling computeScenario...");
        const result = computeScenario(input);

        console.log("LOCKED ITEMS:", result.lockedItems);
        // Assertions
        const central = result.items.find(i => i.key === 'bonus_central');
        console.log(`Central: ${central ? central.ratio : 'MISSING'}`);

        const local = result.items.find(i => i.key === 'bonus_local');
        console.log(`Local: ${local ? local.ratio : 'MISSING'}`);

        const disasters = result.items.find(i => i.key === 'bonus_other');
        console.log(`Disaster: ${disasters ? disasters.ratio : 'MISSING'}`);

        const tod = result.items.find(i => i.key === 'bonus_tod');
        console.log(`TOD: ${tod ? tod.ratio : 'MISSING'}`);

        console.log("Application Total:", result.applicationTotal);

        if (result.applicationTotal === 50) {
            console.log("SUCCESS: Stacked Correctly!");
        } else {
            console.error("FAILURE: Total mismatch.");
        }

    } catch (e) {
        console.error("CRASHED:", e);
        if (e.errors) {
            console.error("ZOD DETAILS:", JSON.stringify(e.errors, null, 2));
        }
    }
}

main();
