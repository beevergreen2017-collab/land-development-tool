export const AUDIT_SOURCES = {
    // Volume & Area
    baseVolume: { source: "Excel V2.5 [Legal] !B12", rule: "土管分區管制規則" },
    siteArea: { source: "Excel V2.5 [Land] !C5", rule: "地籍謄本" },

    // Massing
    estFloors: { source: "Excel V2.5 [Massing] !D15", rule: "慣用估算值 (GFA / 單層)" },
    massingGFA_Total: { source: "Excel V2.5 [Massing] !F20", rule: "含梯廳陽台總坪" },
    estSingleFloorArea: { source: "Excel V2.5 [Massing] !E10", rule: "建蔽率推算" },
    saleableRatio: { source: "Excel V2.5 [Summary] !H5", rule: "銷坪係數" },

    // Basement
    estBasementFloors: { source: "Excel V2.5 [Basement] !C8", rule: "開挖深度檢討" },
    totalExcavationDepth: { source: "Excel V2.5 [Basement] !C10", rule: "樓高係數 (3.3m)" },
    calcTotalParking: { source: "Excel V2.5 [Basement] !D5", rule: "法定+獎勵停車" },

    // Bonus
    applicationTotal: { source: "Excel V2.5 [Bonus] !Sum", rule: "獎勵上限檢討" },
    actualBonus: { source: "Excel V2.5 [Bonus] !Effective", rule: "危老/都更條例" }
};
