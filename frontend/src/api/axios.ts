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
// promise.
let refreshPromise: Promise<string> | null = null;

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
            // Pure guest (no access token at all) — don't attempt a refresh.
            // Guests browse authed-optional endpoints all the time (the Mazii
            // open-access model); a token-less 401 just means "no personal
            // data", not "session expired". Reject quietly so the caller can
            // fall back to empty/public content — NEVER redirect a guest.
            const hasToken = !!localStorage.getItem("token");
            if (!hasToken) {
                return Promise.reject(error);
            }

            originalReq._retry = true;

            try {
                const token = await runRefresh();

                originalReq.headers = {
                    ...originalReq.headers,
                    Authorization: `Bearer ${token}`,
                };

                return axiosInstance(originalReq);
            } catch (err) {
                // Refresh failed → the session is genuinely gone. Drop to guest
                // mode IN PLACE: clear state so the app re-renders as a guest on
                // the CURRENT page (Mazii-style — no hard redirect to /login,
                // which used to reload the page and could loop). ProtectedRoute
                // now shows an in-shell login gate for personal routes, and
                // public routes keep working. clear()/setLogout() are idempotent
                // so a 401 storm dropping here repeatedly is harmless (and the
                // single-flight refreshPromise already dedupes the network call).
                authStorage.clear();
                store.dispatch(setLogout());
                return Promise.reject(err);
            }
        }

        return Promise.reject(error);
    },
);

export default axiosInstance;
