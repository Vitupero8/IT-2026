import axios from "axios";
import { getToken } from "./authService";

const isLocalNetworkHost = (hostname) => (
    hostname === "localhost"
    || hostname === "127.0.0.1"
    || /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)
);

const getApiBaseUrl = () => {
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
    }

    if (typeof window !== "undefined") {
        const protocol = isLocalNetworkHost(window.location.hostname)
            ? "http:"
            : window.location.protocol;

        return `${protocol}//${window.location.hostname}:5000/api`;
    }

    return "http://localhost:5000/api";
};

export const getAssetUrl = (path) => {
    if (!path) return "";

    if (/^https?:\/\//i.test(path)) return path;

    return `${getApiBaseUrl().replace(/\/api\/?$/, "")}${path}`;
};

const api = axios.create({
    baseURL: getApiBaseUrl(),
    timeout: 20000
});

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const shouldRetryRequest = (error) => {
    const config = error.config;

    if (!config) return false;

    const method = String(config.method || "get").toLowerCase();
    const retryCount = config.__retryCount || 0;
    const status = error.response?.status;

    return (
        method === "get"
        && retryCount < 2
        && (!status || status >= 500 || error.code === "ECONNABORTED")
    );
};

api.interceptors.request.use((config) => {
    const token = getToken();

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

api.interceptors.response.use(
    response => response,
    async (error) => {
        if (!shouldRetryRequest(error)) {
            return Promise.reject(error);
        }

        error.config.__retryCount = (error.config.__retryCount || 0) + 1;
        await wait(500 * error.config.__retryCount);

        return api(error.config);
    }
);

export default api;
