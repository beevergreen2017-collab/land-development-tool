export const ZONING_RATES = {
    "住三": { coverage: 45, floor_area: 225 },
    "住三-1": { coverage: 45, floor_area: 300 },
    "住三-2": { coverage: 45, floor_area: 400 },
    "住四": { coverage: 50, floor_area: 300 },
    "住四-1": { coverage: 50, floor_area: 400 },
    "商一": { coverage: 55, floor_area: 360 },
    "商二": { coverage: 65, floor_area: 630 },
    "商三": { coverage: 65, floor_area: 560 },
    "商四": { coverage: 75, floor_area: 800 },
};

export const CENTRAL_BONUS_ITEMS = {
    bonus_high_density: { label: "#5 高於基準容積部分", type: "input", unit: "%" },
    structure_safety: { label: "#6 建築物結構安全", type: "input", unit: "%" },
    donation_public: { label: "#7 捐贈公益設施", type: "input", unit: "%" },
    assist_public_road: { label: "#8 協助開闢公設", type: "input", unit: "%" },
    historic_preservation: { label: "#9 文資保存與維護", type: "input", unit: "%" },
    green_building: { label: "#10 綠建築設計", type: "radio", options: [{ label: "鑽石級", value: 10.0 }, { label: "黃金級", value: 8.0 }, { label: "銀級", value: 6.0 }, { label: "銅級", value: 4.0 }, { label: "無", value: 0.0 }] },
    smart_building: { label: "#11 智慧建築設計", type: "radio", options: [{ label: "鑽石級", value: 10.0 }, { label: "黃金級", value: 8.0 }, { label: "銀級", value: 6.0 }, { label: "銅級", value: 4.0 }, { label: "無", value: 0.0 }] },
    barrier_free: { label: "#12 無障礙環境", type: "radio", options: [{ label: "標章", value: 5.0 }, { label: "一級", value: 4.0 }, { label: "二級", value: 3.0 }, { label: "無", value: 0.0 }] },
    seismic_design: { label: "#13 耐震設計", type: "radio", options: [{ label: "標章", value: 10.0 }, { label: "一級", value: 6.0 }, { label: "二級", value: 4.0 }, { label: "三級", value: 2.0 }, { label: "無", value: 0.0 }] },
    timeline: { label: "#14 時程獎勵", type: "radio", options: [{ label: "10% (6個月內)", value: 10.0 }, { label: "7.5% (6-12個月)", value: 7.5 }, { label: "5% (1-2年)", value: 5.0 }, { label: "無", value: 0.0 }] },
    scale_bonus: { label: "#15 基地規模", type: "input", unit: "%" },
    agreement_100: { label: "#16 協議合建", type: "input", unit: "%" },
    squatter_settlement: { label: "#17 違章戶處理", type: "input", unit: "%" }
};

export const LOCAL_BONUS_ITEMS = {
    urban_A1: { label: "A-1 建築退縮與配置", options: [{ label: "符合5項以上 (3%)", value: 3.0 }, { label: "符合4項 (2%)", value: 2.0 }, { label: "符合3項 (1%)", value: 1.0 }] },
    urban_A2: { label: "A-2 建築斜對角距離", options: [{ label: "符合合格要件 (0%)", value: 0.0 }] },
    urban_B1: { label: "B-1 雨水流出抑制", options: [{ label: "符合 (1%)", value: 1.0 }] },
    urban_C1: { label: "C-1 無遮簷人行道", type: "input", unit: "%" },
    urban_C2: { label: "C-2 騎樓留設", type: "input", unit: "%" },
    urban_D1: { label: "D-1 通案設計原則", options: [{ label: "全數符合 (3%)", value: 3.0 }] },
    urban_E: { label: "E. 綠化與立面", options: [{ label: "E-3: ≥ 2.0倍 (4%)", value: 4.0 }, { label: "E-2: ≥ 1.8倍 (3%)", value: 3.0 }, { label: "E-1: ≥ 1.6倍 (2%)", value: 2.0 }] },
    urban_F1: { label: "F-1 整修鄰棟騎樓", type: "input", unit: "%" },
    tech_N1: { label: "N-1 電動車充電車位", options: [{ label: "符合 (1%)", value: 1.0 }] },
    renew_U1: { label: "U-1 捐助都更基金", type: "input", unit: "%" },
    renew_U2_3: { label: "U-2/U-3 老舊建築誘因", options: [{ label: "U-3: 5層樓以上 (4%)", value: 4.0 }, { label: "U-2: 4層樓 (2%)", value: 2.0 }] },
    special_resettlement: { label: "整建住宅更新單元", options: [{ label: "符合 (直接 20%)", value: 20.0 }] }
};

// --- Disaster (防災型) ---
// --- Disaster (防災型) ---
export const DISASTER_BONUS_ITEMS = {
    // 1. Gates (Conditions) - Standardized Keys
    is_plan_approved: { title: "1. 都市更新程序辦理", type: "checkbox", required: true },
    base_area_m2: { title: "2. 基地規模 (≥1000m²)", type: "input", unit: "m²", required: true },
    has_risk_assessment: { title: "3. 危險建物評估 / 結構安全", type: "checkbox", required: true },

    // 2. Bonus Components (Delta B)
    delta_b1: {
        title: "4. 耐震設計 (ΔB1)",
        type: "radio",
        options: [
            { label: "耐震標章 (10%)", value: 10.0 },
            { label: "耐震 1+ 級 (10%)", value: 10.0 }, // Assuming 1+ is same as Label?
            { label: "耐震 2 級 (6%)", value: 6.0 },
            { label: "耐震 3 級 (4%)", value: 4.0 },
            { label: "無", value: 0.0 }
        ]
    },
    delta_b2: {
        title: "5. 智慧建築 (ΔB2)",
        type: "radio",
        options: [
            { label: "鑽石級 (10%)", value: 10.0 },
            { label: "黃金級 (8%)", value: 8.0 },
            { label: "銀級 (6%)", value: 6.0 },
            { label: "無", value: 0.0 }
        ]
    },
    delta_b3: {
        title: "6. 綠建築 (ΔB3)",
        type: "radio",
        options: [
            { label: "鑽石級 (10%)", value: 10.0 },
            { label: "黃金級 (8%)", value: 8.0 },
            { label: "銀級 (6%)", value: 6.0 },
            { label: "無", value: 0.0 }
        ]
    }
};

// --- Chloride (Sea Sand House) ---
export const CHLORIDE_BONUS_ITEMS = {
    area_ground: { title: "A1 地上層以上 (申請)", type: "input", unit: "m²" },
    area_underground: { title: "B1 地下層 (申請)", type: "input", unit: "m²" }
};

// --- TOD 容積獎勵 (Detailed) ---
export const TOD_CONFIG = {
    station_type: {
        title: "場站分級",
        options: [
            { label: "第一級場站 (高運量/轉乘)", value: "level1" },
            { label: "第二級場站 (其他)", value: "level2" }
        ]
    },
    zone_type: {
        title: "適用分區",
        options: [
            { label: "核心區 (150m內)", value: "core" },
            { label: "一般區 (150-500m)", value: "general" }
        ]
    },
    // Caps definition [Level][Zone]
    caps: {
        level1: { core: 30, general: 15 },
        level2: { core: 20, general: 10 }
    }
};

export const TOD_BONUS_ITEMS = {
    d1_rate: { title: "ΔD1 捷運設施/出入口", type: "input", unit: "%", note: "地面層 1.0 / 其他 0.5" },
    d2_rate: { title: "ΔD2 自行車/停車轉乘", type: "input", unit: "%" },
    d3_rate: { title: "ΔD3 友善人行環境", type: "logic", note: "依等級/項目/棟數計算" },
    d4_rate: { title: "ΔD4 公益設施捐贈", type: "input", unit: "%", note: "捐贈價值 50% 換算" },
    d5_rate: { title: "ΔD5 代金繳納", type: "input", unit: "%", note: "代金價值 50% 換算" }
};

// --- TOD 增額容積 (Increment) ---
export const TOD_INCREMENT_ITEMS = {
    formula_check: { title: "1. 符合土管 80-2 檢核公式", type: "checkbox", required: true },
    road_width: { title: "2. 臨路寬度符合規定", type: "checkbox", required: true },
    scale_check: { title: "3. 基地規模符合規定", type: "checkbox", required: true },
    public_space: { title: "4. 留設開放空間", type: "checkbox", required: false }
};

// --- Enums (Centralized) ---
export const LAND_OWNERSHIP = {
    PRIVATE_SINGLE: 'private_single',
    PRIVATE_MULTIPLE: 'private_multiple',
    PUBLIC: 'public',
    MIXED: 'mixed',
    UNKNOWN: 'unknown'
};

export const LAND_RISK = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    UNKNOWN: 'unknown'
};

export const SITE_POLICY = {
    WEIGHTED: 'weightedAverage',
    CAP_BY_ZONE: 'cap_by_zone',
    CONSERVATIVE: 'conservative'
};

// --- Linkage for UI Selects ---
export const OWNERSHIP_STATUS_OPTIONS = [
    { value: LAND_OWNERSHIP.PRIVATE_SINGLE, label: '私有 (單一)' },
    { value: LAND_OWNERSHIP.PRIVATE_MULTIPLE, label: '私有 (多人)' },
    { value: LAND_OWNERSHIP.PUBLIC, label: '公有' },
    { value: LAND_OWNERSHIP.MIXED, label: '混合' },
    { value: LAND_OWNERSHIP.UNKNOWN, label: '未確認' }
];

export const INTEGRATION_RISK_OPTIONS = [
    { value: LAND_RISK.LOW, label: '低風險' },
    { value: LAND_RISK.MEDIUM, label: '中風險' },
    { value: LAND_RISK.HIGH, label: '高風險' },
    { value: LAND_RISK.UNKNOWN, label: '未知' }
];

export const MIXED_ZONE_POLICY_OPTIONS = [
    { value: SITE_POLICY.WEIGHTED, label: '加權平均 (Weighted Average)' },
    { value: SITE_POLICY.CAP_BY_ZONE, label: '分區各自上限 (Cap by Zone)' },
    { value: SITE_POLICY.CONSERVATIVE, label: '保守原則 (Conservative)' }
];
