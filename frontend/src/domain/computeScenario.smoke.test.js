import { describe, it, expect } from 'vitest';
import { computeScenario } from './computeScenario.js';

describe('computeScenario Smoke Test', () => {
    // Basic Mock Data
    const mockParcels = [
        { id: '1', district: 'D1', section_name: 'S1', lot_number: 'L1', zoning_type: 'R3', area_m2: 100, legal_floor_area_rate: 200, legal_coverage_rate: 60, farLimit: 560, bcrLimit: 65, include_in_site: true },
        { id: '2', district: 'D1', section_name: 'S1', lot_number: 'L2', zoning_type: 'R3', area_m2: 200, legal_floor_area_rate: 200, legal_coverage_rate: 60, farLimit: 560, bcrLimit: 65, include_in_site: true }
    ];

    const baseInput = {
        project: {
            id: 'p1',
            name: 'Smoke Test Project', // Required
            user_id: 1, // Required
            land_parcels: mockParcels,
            site: {
                selectedParcelIds: ['1', '2'], // Select Both
                allocation: {}
            }
        },
        bonus: {
            bonus_central: 0,
            bonus_local: 0,
            bonus_other: 0,
            bonus_public_exemption: 0,
            centralBonusDetails: {},
            localBonusDetails: {},
            disasterBonusDetails: {},
            chlorideBonusDetails: {},
            todRewardBonusDetails: {},
            todIncrementBonusDetails: {}
        },
        massing: {
            design_coverage: 60,
            public_ratio: 30
        },
        basement: {
            excavation_rate: 80
        }
    };

    it('should calculate siteArea and maxGfa correctly provided selected parcels', () => {
        const result = computeScenario(baseInput);

        // Validation
        const stats = result.siteStats;

        // siteArea = 100 + 200 = 300
        expect(stats.totalArea).toBe(300);

        // maxGfa = (100 * 5.6) + (200 * 5.6) = 560 + 1120 = 1680
        expect(stats.maxGFA).toBe(1680);

        // maxFootprint = (100 * 0.65) + (200 * 0.65) = 65 + 130 = 195
        expect(stats.maxBuildingArea).toBe(195);

        // Base Volume for Bonus should match maxGfa (Site Context)
        expect(result.baseVolume).toBe(1680);
    });

    it('should fallback to ALL parcels if selection is undefined (Graceful Degradation)', () => {
        const inputNoSelection = { ...baseInput, project: { ...baseInput.project, site: undefined } };
        const result = computeScenario(inputNoSelection);

        expect(result.siteStats.totalArea).toBe(300);
        expect(result.baseVolume).toBe(1680);
    });

    it('should handle partial selection', () => {
        const inputPartial = {
            ...baseInput,
            project: {
                ...baseInput.project,
                site: { selectedParcelIds: ['1'] }
            }
        };
        const result = computeScenario(inputPartial);

        // siteArea = 100
        expect(result.siteStats.totalArea).toBe(100);
        expect(result.baseVolume).toBe(560); // 100 * 5.6
    });
});
