import axios from "axios";
import { store } from "@/store/store";
import { setLogin, setLogout } from "@/store/slices/auth/authSlice";
import { authStorage, mapAuthResponse, type BackendAuthResponse } from "@/lib/auth-storage";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api";

const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
    withCredentials: true,
});

axiosInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("token");
        const requestUrl = config.url ?? "";
        const isAuthRequest = requestUrl.startsWith("/auth/") || requestUrl.includes("/auth/");

        if (token && !isAuthRequest) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // Send the user's active locale so the BE can localise dynamic content
        // (module titles, validation messages, email subjects...). Sourced from
        // localStorage rather than Redux to avoid coupling axios to the store.
        const locale = localStorage.getItem("app-locale") || localStorage.getItem("locale");
        if (locale) {
            config.headers["Accept-Language"] = locale;
        }
        return config;
    },
    (error) => Promise.reject(error),
);

let isRefreshing = false;
let pendingQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];

const drainQueue = (err: unknown, token: string | null = null) => {
    pendingQueue.forEach((p) => (err ? p.reject(err) : p.resolve(token!)));
    pendingQueue = [];
};

axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalReq = error.config;
        const requestUrl = originalReq?.url ?? "";

        if (!originalReq) {
            return Promise.reject(error);
        }

        if (
            error?.response?.status === 401 &&
            !originalReq._retry &&
            !requestUrl.includes("/auth/login") &&
            !requestUrl.includes("/auth/logout") &&
            !requestUrl.includes("/auth/refresh")
        ) {
            originalReq._retry = true;

            if (isRefreshing) {
                // Queue this request until the in-flight refresh resolves
                return new Promise<string>((resolve, reject) => {
                    pendingQueue.push({ resolve, reject });
                }).then((token) => {
                    originalReq.headers = { ...originalReq.headers, Authorization: `Bearer ${token}` };
                    return axiosInstance(originalReq);
                });
            }

            isRefreshing = true;
            try {
                const res = await axios.post<BackendAuthResponse>(
                    `${API_BASE_URL}/auth/refresh`,
                    {},
                    { withCredentials: true },
                );
                const authData = mapAuthResponse(res.data);

                store.dispatch(setLogin(authData));
                drainQueue(null, authData.token);
                originalReq.headers = {
                    ...originalReq.headers,
                    Authorization: `Bearer ${authData.token}`,
                };

                return axiosInstance(originalReq);
            } catch (err) {
                authStorage.clear();
                store.dispatch(setLogout());
                window.location.href = "/login";
                return Promise.reject(err);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    },
);

export default axiosInstance;
