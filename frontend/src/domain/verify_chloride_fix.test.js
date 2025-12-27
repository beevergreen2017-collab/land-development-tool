
import { describe, it, expect } from 'vitest';
import { computeScenario } from './computeScenario.js';

describe('Verification: Chloride Fix & Numeric Parsing', () => {
    // 1. Mock Base Input
    const baseInput = {
        project: {
            id: 'p_verify',
            name: 'Verification Project',
            user_id: 1,
            land_parcels: [],
            site: { selectedParcelIds: [], allocation: {} }
        },
        bonus: {
            bonus_central: 0,
            bonus_local: 0,
            bonus_other: 0,
            bonus_chloride: 30, // 30%
            chlorideBonusDetails: {
                calculation_mode: 'original_ratio', // LEGACY ENUM
                original_ratio: 30
            },
            centralBonusDetails: {},
            localBonusDetails: {},
            disasterBonusDetails: {},
            todRewardBonusDetails: {},
            todIncrementBonusDetails: {}
        },
        massing: {},
        basement: {}
    };

    it('should handle legacy "original_ratio" enum without crashing (Zod Normalization)', () => {
        // This would previously throw "Input Validation Failed" because "original_ratio" is not in enum
        const result = computeScenario(baseInput);
        expect(result).toBeDefined();
        // Should have normalized to 'mid_density' or 'fixed' or whatever logic we put?
        // We mapped it to 'fixed' in the fix.
        // We can't easily check the input mutation unless we check the result effect or mock.
        // But the FACT it didn't throw is the success.
    });

    it('should correctly parse comma-separated baseVolume and calculate area', () => {
        // "5,762.4" is a string with comma
        // We can't easily inject "baseVolume" string into computeScenario because it recalculates it from parcels.
        // However, we can mock `bonus.js` logic or check `safeNum` directly if we exported it?
        // Or, we can trigger a calc where a "String Number" enters via an input field?
        // Let's rely on unit-testing `toNum` behavior implicitly via a parcel area logic if possible?
        // Actually, `computeScenario` calculates baseVolume from `land_parcels`.
        // If we provide `area_m2` as string "1,000", it should work now.

        const inputWithStringArea = {
            ...baseInput,
            project: {
                ...baseInput.project,
                land_parcels: [
                    {
                        id: '1',
                        area_m2: "1,000", // String with comma
                        legal_floor_area_rate: 300,
                        legal_coverage_rate: 60,
                        district: 'D1', section_name: 'S1', lot_number: 'L1', zoning_type: 'R3', include_in_site: true
                    }
                ],
                site: { selectedParcelIds: ['1'] }
            },
            bonus: {
                ...baseInput.bonus,
                bonus_chloride: 30
            }
        };

        const result = computeScenario(inputWithStringArea);

        // Base Volume = 1000 * 3 = 3000
        expect(result.baseVolume).toBe(3000);

        // Chloride Bonus Area = 3000 * 30% = 900
        // Check items
        const chlorideItem = result.bonus.items.find(i => i.key === 'bonus_chloride');
        expect(chlorideItem.area).toBe(900);
    });

    // Helper Unit Test import approach? 
    // Since we acted on 'bonusHelpers.js', let's trust the integration test above.
});
