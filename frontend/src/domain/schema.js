import { z } from 'zod';
import { LAND_OWNERSHIP, LAND_RISK, SITE_POLICY } from './constants';

// --- Base Entities ---

export const LandParcelSchema = z.object({
    // Strict Coercion: Handles string, number, or any primitive that can be stringified
    id: z.coerce.string().optional(),
    district: z.string(),
    section_name: z.string(),
    lot_number: z.string(),
    area_m2: z.number().min(0),
    zoning_type: z.string(),
    legal_coverage_rate: z.number().min(0).max(100),
    legal_floor_area_rate: z.number().min(0),
    road_width: z.coerce.number().optional(),

    // New Mixed Use Fields (with defaults for old data)
    bcrLimit: z.number().nullable().default(null).optional(),
    farLimit: z.number().nullable().default(null).optional(),
    ownershipStatus: z.nativeEnum(LAND_OWNERSHIP).default(LAND_OWNERSHIP.UNKNOWN).optional(),
    integrationRisk: z.nativeEnum(LAND_RISK).default(LAND_RISK.UNKNOWN).optional(),
    includeInSite: z.boolean().default(true).optional()
});

export const SiteSchema = z.object({
    selectedParcelIds: z.array(z.string()).default([]),
    mixedZonePolicy: z.nativeEnum(SITE_POLICY).default(SITE_POLICY.WEIGHTED),
    allocation: z.object({
        resCapGfa: z.number().optional(),
        comCapGfa: z.number().optional(),
        usePlan: z.object({
            residentialGfaPlanned: z.number().default(0),
            commercialGfaPlanned: z.number().default(0)
        }).default({})
    }).default({}),
    computed: z.any().optional(), // Placeholders for now
    zoneBreakdown: z.any().optional()
});

export const ProjectSchema = z.object({
    id: z.coerce.string().optional(),
    name: z.string(),
    land_parcels: z.array(LandParcelSchema).default([]),
    // Site Structure (New)
    site: SiteSchema.default({}), // Default empty object triggers defaults within SiteSchema

    bcr: z.number().optional().default(0), // Build Coverage Ratio
    far: z.number().optional().default(0),  // Floor Area Ratio

    // Bonus Details (Persisted as JSON in DB)
    central_bonus_details: z.record(z.any()).optional().default({}),
    local_bonus_details: z.record(z.any()).optional().default({}),
    disaster_renewal_bonus_details: z.record(z.any()).optional().default({}),
    chloride_bonus_details: z.record(z.any()).optional().default({}),

    // [NEW] Canonical TOD Bonus
    tod_bonus_details: z.object({
        checklist: z.record(z.any()).default({}), // Uses generic record, validated/defaulted in modal
        calc_result: z.record(z.any()).default({}) // Store details like final D1..D5 ratios
    }).optional().default({}),

    site_config: z.record(z.any()).optional().default({})
}).passthrough();

// --- User Inputs (Scenario) ---

// Standardized Bonus Detail Structure
export const BonusDetailStruct = z.object({
    enabled: z.boolean().default(true),
    calculation_mode: z.enum(['existing_gfa', 'allowed_gfa', 'site_area', 'fixed']).default('allowed_gfa'),
    base_area_m2: z.number().default(0), // Basis for calculation
    applied_rate_percent: z.number().default(0),
    bonus_area_m2: z.number().default(0), // Resulting area
    checklist: z.record(z.union([z.boolean(), z.number(), z.string()])).default({})
});

export const BonusInputSchema = z.object({
    bonus_central: z.number().default(0),
    bonus_local: z.number().default(0),
    bonus_other: z.number().default(0), // [Fix] Canonical
    // disaster_renewal_bonus_ratio: z.number().default(0), // Removed to enforce canonical usage
    bonus_chloride: z.number().default(0),
    bonus_tod: z.number().default(0), // [NEW] Canonical TOD
    bonus_soil_mgmt: z.number().default(0),
    bonus_public_exemption: z.number().default(0),
    bonus_cap: z.number().default(100.0),

    // Detailed Structures
    centralBonusDetails: BonusDetailStruct.default({}),
    localBonusDetails: BonusDetailStruct.default({}),
    disasterBonusDetails: BonusDetailStruct.default({}),
    chlorideBonusDetails: BonusDetailStruct.default({})
});

export const MassingInputSchema = z.object({
    design_coverage: z.number().default(45.0),
    exemption_coef: z.number().default(1.15),
    public_ratio: z.number().default(33.0),
    me_rate: z.number().default(15.0),
    stair_rate: z.number().default(10.0),
    balcony_rate: z.number().default(5.0),
    // Usage Mix
    residential_rate: z.number().default(60.0),
    commercial_rate: z.number().default(30.0),
    agency_rate: z.number().default(10.0)
});

export const BasementInputSchema = z.object({
    legal_parking: z.number().default(0),
    bonus_parking: z.number().default(0),
    excavation_rate: z.number().default(70.0),
    parking_space_area: z.number().default(40.0),
    floor_height: z.number().default(3.3),
    legal_motorcycle: z.number().default(0),
    motorcycle_unit_area: z.number().default(4.0)
});

// Primary Input for Computation
export const ScenarioInputSchema = z.object({
    project: ProjectSchema,
    bonus: BonusInputSchema,
    massing: MassingInputSchema,
    basement: BasementInputSchema
});

// --- Calculation Results ---

export const UsageAreaSchema = z.object({
    residential: z.number(),
    commercial: z.number(),
    agency: z.number()
});

export const MassingResultSchema = z.object({
    allowedVolumeArea: z.number(),  // 允建總容積
    massingMEArea: z.number(),      // 機電管委會面積
    massingStairArea: z.number(),   // 梯廳面積
    massingBalconyArea: z.number(), // 陽台面積
    massingGFA_NoBalcony: z.number(),
    massingGFA_Total: z.number(),
    estRegisteredArea: z.number(),  // 預估登記面積
    saleableRatio: z.number(),      // 銷坪比
    estSingleFloorArea: z.number(), // 預估單層面積
    estFloors: z.number(),          // 預估樓層數
    usageAreas: UsageAreaSchema
});

export const BasementResultSchema = z.object({
    basementFloorArea: z.number(),   // 地下室單層開挖面積
    calcTotalParking: z.number(),    // 總停車位數 (法定+獎勵)
    totalRequiredArea: z.number(),   // 總需求面積
    estBasementFloors: z.number(),   // 預估開挖樓層
    totalExcavationDepth: z.number(),// 預估開挖深度
    basementTotalGFA: z.number()     // 地下室總樓地板
});

export const BonusItemResultSchema = z.object({
    key: z.string(),
    label: z.string(),
    ratio: z.number(),
    area: z.number(),
    note: z.string().optional().nullable(),
    details: z.union([
        z.array(z.object({
            id: z.string(),
            label: z.string(),
            value: z.number(),
            note: z.string().optional(),
            source: z.string().optional(),
            isCompliant: z.boolean().optional()
        })),
        z.object({
            eligibility: z.object({
                urbanRenewalMode: z.boolean(),
                siteAreaM2: z.number(),
                siteAreaOk: z.boolean(),
                legalBuildingProof: z.enum(['usePermit', 'legalProof', 'simplified']).nullable(),
                seismicPath: z.enum(['ID_LT_035', 'PRE_630215_USE_PERMIT_EXEMPT']).nullable(),
                idValue: z.number().nullable(),
                consentMeetURAct37: z.boolean().nullable(),
                missing: z.array(z.string())
            }),
            designRequirements: z.object({
                seismicDesign: z.enum(['notStarted', 'candidate', 'passed', 'certified']),
                greenBuilding: z.enum(['notStarted', 'candidate', 'passed', 'certified']),
                energyEfficiency1Plus: z.enum(['notStarted', 'candidate', 'passed', 'certified']),
                smartBuilding: z.enum(['notStarted', 'candidate', 'passed', 'certified']),
                permeableAndRunoff: z.enum(['notStarted', 'candidate', 'passed', 'certified']),
                accessibleEnv: z.enum(['notStarted', 'candidate', 'passed', 'certified'])
            }),
            exclusivity: z.object({
                mode: z.string().optional() // Keep mode for reference, remove locks
            }),
            scheduleAndDeposit: z.object({
                planApprovalDate: z.string().nullable(),
                permitDeadlineOk: z.boolean().nullable(),
                depositFactor: z.number(),
                depositAmount: z.number().nullable()
            })
        }),
        z.record(z.any()) // Allow generic objects for other bonuses
    ]).default([])
});

export const BonusResultSchema = z.object({
    applicationTotal: z.number(),
    actualBonus: z.number(),
    totalAllowedRate: z.number(),
    items: z.array(BonusItemResultSchema),
    cap: z.number(),
    publicExemption: z.number(),
    lockedItems: z.array(z.string()).default([]) // [Deprecated] Kept empty for compat, but unused
});

// --- Computed Stats Schemas ---
export const ParcelStatsSchema = z.object({
    id: z.string(),
    maxFootprint: z.number().nullable(),
    maxGfa: z.number().nullable(),
    warnings: z.array(z.object({
        type: z.string(),
        path: z.string(),
        msg: z.string()
    })).default([])
});

export const SiteStatsSchema = z.object({
    count: z.number().default(0),
    totalArea: z.number().default(0),
    totalAllowedGFA: z.number().default(0),
    // Computed Limits
    maxBuildingArea: z.number().default(0),
    maxGFA: z.number().default(0),

    // Status
    gfaDiff: z.number().default(0),
    isDiffWarning: z.boolean().default(false),

    // Metadata
    policy: z.string().optional(),
    zoneBreakdown: z.any().optional(), // Detailed breakdown object
    validations: z.array(z.any()).default([])
});

export const CalculationResultSchema = z.object({
    baseVolume: z.number(), // 法定基準容積 (Area * FAR)
    siteArea: z.number(),   // 基地面積
    siteStats: SiteStatsSchema.default({}),
    parcelStats: z.array(ParcelStatsSchema).default([]), // Per-parcel baseline
    bonus: BonusResultSchema,
    massing: MassingResultSchema,
    basement: BasementResultSchema,
    audit: z.record(z.union([
        z.string(),
        z.object({
            source: z.string().optional(),
            rule: z.string().optional(),
            note: z.string().optional()
        }).passthrough()
    ])).optional(),
    snapshot: z.object({
        calculationVersion: z.string(),
        timestamp: z.string(),
        inputHash: z.string()
    })
});

