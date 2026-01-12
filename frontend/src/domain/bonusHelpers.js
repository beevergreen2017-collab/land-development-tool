export const toNum = (v, fallback = 0) => {
    if (typeof v === "number") return Number.isFinite(v) ? v : fallback;
    if (v === null || v === undefined) return fallback;
    const str = String(v).trim().replace(/,/g, '');
    const n = Number(str);
    return Number.isFinite(n) ? n : fallback;
};

export const fmtFixed = (v, digits = 2, fallback = "0.00") => {
    const n = toNum(v, NaN);
    return Number.isFinite(n) ? n.toFixed(digits) : fallback;
};


