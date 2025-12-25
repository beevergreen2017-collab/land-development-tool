export const parseApiError = (error) => {
    console.error("Raw API Error:", error);

    // 1. Connection Refused / Network Error / CORS
    // Axios usually returns "Network Error" for both connection refused and CORS failures.
    if (!error.response) {
        return {
            code: 'NETWORK_ERROR',
            title: 'Connection Error',
            message: '無法連接後端伺服器',
            hint: '請檢查後端是否已啟動 (Port 8001)，或確認 CORS 設定是否正確。'
        };
    }

    const status = error.response.status;
    const data = error.response.data;

    // 2. 500 Internal Server Error
    if (status === 500) {
        return {
            code: 'SERVER_ERROR',
            title: 'Backend Error (500)',
            message: data?.message || data?.detail || '伺服器內部錯誤',
            hint: data?.hint || '請檢查後端 Terminal 的錯誤日誌 (Traceback)。'
        };
    }

    // 3. 404 Not Found (Possibility of Proxy Error)
    if (status === 404) {
        // If response is HTML, it's likely hitting the Frontend SPA fallback instead of API
        if (typeof data === 'string' && data.includes('<!doctype html>')) {
            return {
                code: 'PROXY_ERROR',
                title: 'Proxy Error (404)',
                message: 'API 路徑未正確轉發',
                hint: 'Vite Proxy 可能設定錯誤，導致請求被導向 index.html。'
            };
        }
        return {
            code: 'NOT_FOUND',
            title: 'Resource Not Found',
            message: '請求的資源不存在',
            hint: '請確認 API 路徑是否正確。'
        };
    }

    // 4. Other HTTP Errors
    return {
        code: `HTTP_${status}`,
        title: `Request Failed (${status})`,
        message: data?.detail || data?.message || error.message,
        hint: JSON.stringify(data) || ''
    };
};
