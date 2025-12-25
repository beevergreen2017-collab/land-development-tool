import axios from 'axios';

const envApiUrl = import.meta.env.VITE_API_BASE_URL;
// Default to /api for proxy usage, or fallback to direct URL if needed (but proxy is preferred)
export const API_URL = envApiUrl || '/api';

const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export default apiClient;
