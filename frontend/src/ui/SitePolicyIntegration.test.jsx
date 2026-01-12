import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import ScenarioForm from './ScenarioForm';
import useProjectStore from '../store/useProjectStore';
import { SITE_POLICY } from '../domain/constants';

// --- Mocks ---
// 1. Mock APIs (Dependencies of Store)
vi.mock('../api/projects', () => ({
    updateProject: vi.fn(),
    fetchProjectDetails: vi.fn()
}));
vi.mock('../api/parcels', () => ({
    createParcel: vi.fn(),
    updateParcel: vi.fn()
}));

// 2. Mock Child Components
vi.mock('../components/LandMap', () => ({ default: () => <div data-testid="land-map">Map</div> }));
// DetailModalFooter might be used, mock it carefully or let it render if simple
vi.mock('./DetailModalFooter', () => ({ default: () => <div data-testid="modal-footer">Footer</div> }));

describe('Integration: Site Policy UI (Real Store)', () => {

    beforeEach(() => {
        // Reset Store State
        useProjectStore.setState({
            selectedProject: {
                id: '1',
                land_parcels: [
                    { id: '1', district: 'AA', section_name: 'S1', lot_number: '1', area_m2: 100, zoning_type: 'UsageA', bcrLimit: 50, farLimit: 200, includeInSite: true, legal_floor_area_rate: 200 },
                    { id: '2', district: 'AA', section_name: 'S1', lot_number: '2', area_m2: 100, zoning_type: 'UsageB', bcrLimit: 60, farLimit: 400, includeInSite: true, legal_floor_area_rate: 400 }
                ]
            },
            siteInputs: {
                mixedZonePolicy: SITE_POLICY.WEIGHTED,
                selectedParcelIds: ['1', '2']
            },
            // Initialize other states to avoid crash
            massingInputs: { design_coverage: 45 },
            bonusData: { bonus_cap: 100 },
            basementInputs: {},
            centralBonusDetails: { checklist: {}, enabled: true },
            localBonusDetails: { checklist: {}, enabled: true },
            disasterBonusDetails: { checklist: {}, enabled: true },
            // Important: computedResult is null initially? 
            // We should run computation or set initial computedResult
            computedResult: null
        });

        // Trigger initial computation to populate computedResult
        useProjectStore.getState().runComputation();
    });

    it('Renders initial Weighted Policy and Correct Calculation', () => {
        render(<ScenarioForm />);

        // 1. Verify Policy Button Active
        const weightedBtn = screen.getByText('面積加權平均 (Weighted Average)').closest('button');
        expect(weightedBtn).toBeInTheDocument();
        expect(weightedBtn.className).toContain('border-orange-500');

        // 2. Verify Calculation (Weighted: 100*2 + 100*4 = 600 MaxGFA)
        // Look for Max GFA text.
        // The text is rendered as locale string.
        expect(screen.getByText('600.0 m²')).toBeInTheDocument(); // Exact match might need tweak depending on formatting
    });

    it('Switches to Conservative and updates calculation', async () => {
        render(<ScenarioForm />);

        // 1. Click Conservative
        const conservativeBtn = screen.getByText('保守認定 (Conservative)').closest('button');
        fireEvent.click(conservativeBtn);

        // 2. Verify Store Updated
        expect(useProjectStore.getState().siteInputs.mixedZonePolicy).toBe(SITE_POLICY.CONSERVATIVE);

        // 3. Verify UI Updated
        // Conservative: TotalArea(200) * MinRate(200%) = 400 MaxGFA
        await waitFor(() => {
            expect(screen.getByText('400.0 m²')).toBeInTheDocument();
        });
    });

    it('Displays validations when data missing', async () => {
        // Update store with bad parcel
        useProjectStore.setState({
            selectedProject: {
                id: '1',
                land_parcels: [
                    { id: '1', district: 'A', area_m2: 100, zoning_type: 'R', bcrLimit: null, farLimit: 200, includeInSite: true } // Missing BCR
                ]
            },
            siteInputs: { mixedZonePolicy: SITE_POLICY.WEIGHTED, selectedParcelIds: ['1'] }
        });
        useProjectStore.getState().runComputation();

        render(<ScenarioForm />);

        await waitFor(() => {
            expect(screen.getByText(/1 筆地號缺少建蔽率/)).toBeInTheDocument();
        });
    });
});
