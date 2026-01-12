import axios from 'axios';

// Use Render URL in production, Vite proxy in development
const baseURL = import.meta.env.PROD
    ? "https://land-development-tool.onrender.com"
    : "/api";

const apiClient = axios.create({
    baseURL: baseURL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export default apiClient;
