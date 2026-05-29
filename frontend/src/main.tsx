import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import App from "./App";
import "./index.css";
import { store } from "./store/store";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Don't retry auth failures — a 401/403 won't fix itself by retrying, and
      // the default 3 retries multiply the /auth/refresh storm. Retry other
      // (e.g. network) errors up to twice.
      retry: (failureCount, error) => {
        const status = (error as { response?: { status?: number } })?.response?.status;
        if (status === 401 || status === 403) return false;
        return failureCount < 2;
      },
      // Refetching every query on window focus re-triggers the same auth storm
      // whenever the user tabs back in with a stale token.
      refetchOnWindowFocus: false,
    },
  },
});

const THEME_STORAGE_KEY = "theme";
const SYSTEM_THEME_QUERY = "(prefers-color-scheme: dark)";

const initializeTheme = () => {
  const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  const prefersDark = window.matchMedia(SYSTEM_THEME_QUERY).matches;
  const resolvedTheme =
    storedTheme === "light"
      ? "light"
      : storedTheme === "dark"
        ? "dark"
        : prefersDark
          ? "dark"
          : "light";

  const root = document.documentElement;
  root.classList.toggle("dark", resolvedTheme === "dark");
  root.style.colorScheme = resolvedTheme;
};

initializeTheme();


ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Provider store={store}>
        <QueryClientProvider client={queryClient}>
            <App />
        </QueryClientProvider>
    </Provider>
  </React.StrictMode>
);
