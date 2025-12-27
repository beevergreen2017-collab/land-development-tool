import { calculateBonus } from './calculators/bonus.js';

describe('Soil 80-2 Bonus Rules', () => {
    // Helper to create mock structure
    const createBonusInput = (soil) => ({
        bonus_soil_mgmt: soil,
        bonus_cap: 50,
        // others empty
    });

    const BASE_VOL = 1000;

    test('Case 1: Site Area < 2000 (e.g. 1500) -> effectiveRate = 0', () => {
        const input = createBonusInput(20);
        const result = calculateBonus(input, BASE_VOL, 1500); // 1500 m2
        const soilItem = result.items.find(i => i.key === 'bonus_soil_mgmt');

        expect(soilItem.ratio).toBe(20); // Display stays 20
        expect(soilItem.effectiveRate).toBe(0); // Effective is 0
        expect(soilItem.note).toContain('未達 2,000㎡');

        // Sum check
        // application might show 20? 
        // Aggregation logic in bonus.js:
        // const applicationTotal = aggItems.reduce((a, b) => a + safeNum(b.ratio), 0);
        // The display total includes it.
        // effectiveSum uses effectiveRate.
        expect(result.applicationTotal).toBe(20);
        expect(result.actualBonus).toBe(0); // Cap of 0 is 0
    });

    test('Case 2: Site Area >= 2000 (e.g. 3000) & Input 40 -> effectiveRate = 30 (Cap)', () => {
        const input = createBonusInput(40);
        const result = calculateBonus(input, BASE_VOL, 3000); // 3000 m2
        const soilItem = result.items.find(i => i.key === 'bonus_soil_mgmt');

        expect(soilItem.ratio).toBe(40);
        expect(soilItem.effectiveRate).toBe(30); // 40 capped at 30
        expect(soilItem.note).toContain('上限 30%');

        expect(result.actualBonus).toBe(30);
    });

    test('Case 3: Site Area >= 2000 (e.g. 2000) & Input 20 -> effectiveRate = 20', () => {
        const input = createBonusInput(20);
        const result = calculateBonus(input, BASE_VOL, 2000); // Exact boundary
        const soilItem = result.items.find(i => i.key === 'bonus_soil_mgmt');

        expect(soilItem.ratio).toBe(20);
        expect(soilItem.effectiveRate).toBe(20);
        expect(soilItem.note).toContain('上限 30%'); // Generic note or specific?

        expect(result.actualBonus).toBe(20);
    });
});
