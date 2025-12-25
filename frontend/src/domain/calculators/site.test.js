import { describe, it, expect } from 'vitest';
import { calculateSiteOutcome } from './site';
import { SITE_POLICY } from '../constants';

describe('Site Calculation Policies', () => {

    // Helper: Create parcels
    // Zone A: 100m2, FAR 200, BCR 50
    const parcelA = {
        id: 'p1', includeInSite: true, area_m2: 100, zoning_type: 'Resident',
        bcrLimit: 50, farLimit: 200
    };

    // Zone B: 100m2, FAR 400, BCR 60
    const parcelB = {
        id: 'p2', includeInSite: true, area_m2: 100, zoning_type: 'Commercial',
        bcrLimit: 60, farLimit: 400
    };

    const totalArea = 200;

    // Group 1: Homogeneous Zone (2x Residential)
    // Total Area: 200
    // Weighted: (100*200% + 100*200%) = 400 MaxGFA
    // Cap By Zone: 200 + 200 = 400 MaxGFA
    // Conservative: Total * Min(200%) = 400 MaxGFA
    describe('Scenario 1: Homogeneous Zone (Residential Only)', () => {
        const parcels = [{ ...parcelA, id: 'p1' }, { ...parcelA, id: 'p2' }];

        it('Weighted Average: Should sum normally', () => {
            const result = calculateSiteOutcome(parcels, SITE_POLICY.WEIGHTED);
            expect(result.maxGfa).toBe(400);
            expect(result.policy).toBe(SITE_POLICY.WEIGHTED);
        });

        it('Cap by Zone: Should match sum', () => {
            const result = calculateSiteOutcome(parcels, SITE_POLICY.CAP_BY_ZONE);
            expect(result.maxGfa).toBe(400);
        });

        it('Conservative: Should match sum (Min Rate is same)', () => {
            const result = calculateSiteOutcome(parcels, SITE_POLICY.CONSERVATIVE);
            expect(result.maxGfa).toBe(400);
        });
    });

    // Group 2: Mixed Zone (Residential + Commercial)
    // Total Area: 200
    // Weighted: (100*200% + 100*400%) = 200 + 400 = 600 MaxGFA
    // Cap By Zone: 200 + 400 = 600 MaxGFA
    // Conservative: Total * Min(200%, 400%) = 200 * 200% = 400 MaxGFA
    describe('Scenario 2: Mixed Zone (Res + Com)', () => {
        const parcels = [parcelA, parcelB];

        it('Weighted Average: Should sum different rates (600)', () => {
            const result = calculateSiteOutcome(parcels, SITE_POLICY.WEIGHTED);
            expect(result.maxGfa).toBe(600);
        });

        it('Cap by Zone: Should match sum (600)', () => {
            const result = calculateSiteOutcome(parcels, SITE_POLICY.CAP_BY_ZONE);
            expect(result.maxGfa).toBe(600);
        });

        it('Conservative: Should use lowest rate (Returns 400)', () => {
            const result = calculateSiteOutcome(parcels, SITE_POLICY.CONSERVATIVE);
            expect(result.maxGfa).toBe(400);
            expect(result.maxGfa).toBeLessThan(600); // Verify it is indeed conservative
        });
    });

    // Extra: Missing Data Fallback
    it('Safety: Handles missing rates gracefully', () => {
        const badParcel = { id: 'p3', includeInSite: true, area_m2: 100, zoning_type: 'Unknown' }; // No limits
        const result = calculateSiteOutcome([parcelA, badParcel], SITE_POLICY.WEIGHTED);

        // Parcel A: 200, Bad: 0. Total 200.
        expect(result.maxGfa).toBe(200);
        expect(result.validations.length).toBeGreaterThan(0);
        expect(result.validations[0].type).toBe('warn');
    });
});
