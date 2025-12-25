/**
 * Simple string hash function (djb2 implementation)
 * Sufficient for frontend change detection, not cryptographic security.
 */
export const simpleHash = (str) => {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = (hash * 33) ^ str.charCodeAt(i);
    }
    return (hash >>> 0).toString(16);
};

/**
 * Deterministic object hash
 * Sorts keys to ensure same content = same hash
 */
export const computeObjectHash = (obj) => {
    const str = JSON.stringify(obj, (key, value) => {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            return Object.keys(value)
                .sort()
                .reduce((sorted, k) => {
                    sorted[k] = value[k];
                    return sorted;
                }, {});
        }
        return value;
    });
    return simpleHash(str);
};
