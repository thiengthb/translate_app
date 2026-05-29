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

// Single-flight refresh: when many requests fail with 401 at once (e.g. on app
// boot with a stale access token), they must NOT each fire their own
// /auth/refresh — that creates a "refresh storm" hammering the BE. Instead the
// first 401 starts one refresh and every concurrent 401 awaits that same
// promise. `isLoggingOut` guards against repeated clear()/redirect once the
// refresh has definitively failed.
let refreshPromise: Promise<string> | null = null;
let isLoggingOut = false;

const runRefresh = (): Promise<string> => {
    if (!refreshPromise) {
        refreshPromise = axios
            .post<BackendAuthResponse>(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true })
            .then((res) => {
                const authData = mapAuthResponse(res.data);
                store.dispatch(setLogin(authData));
                return authData.token;
            })
            .finally(() => {
                refreshPromise = null;
            });
    }
    return refreshPromise;
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
                const token = await runRefresh();

                originalReq.headers = {
                    ...originalReq.headers,
                    Authorization: `Bearer ${token}`,
                };

                return axiosInstance(originalReq);
            } catch (err) {
                // Only the first failed refresh clears state + redirects; later
                // waiters from the same storm fall through silently.
                if (!isLoggingOut) {
                    isLoggingOut = true;
                    authStorage.clear();
                    store.dispatch(setLogout());
                    // Already on /login → don't hard-navigate (would reload the
                    // page, re-fire the same failing request, and loop).
                    if (window.location.pathname !== "/login") {
                        window.location.href = "/login";
                    }
                }
                return Promise.reject(err);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    },
);

export default axiosInstance;
