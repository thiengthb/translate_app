import { authStorage } from "@/lib/auth-storage";
import type { AuthState, LoginResponse } from "@/types/features/auth";
import { normalizeAuthRolePayload } from "@/utils/rbac.utils";
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

const hydrated = authStorage.load();

const initialState: AuthState = {
    token: hydrated.token,
    email: hydrated.email,
    firstName: hydrated.firstName,
    lastName: hydrated.lastName,
    role: hydrated.role,
    locale: hydrated.locale,
    theme: hydrated.theme,
    roles: hydrated.roles,
    permissions: hydrated.permissions,
    rolePermissions: hydrated.rolePermissions,
    isAuthenticated: hydrated.isAuthenticated,
};

const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        setLogin: (state, action: PayloadAction<LoginResponse>) => {
            const {
                token = "",
                permissions = [],
                rolePermissions = {},
                roles = [],
                email = "",
                firstName = "",
                lastName = "",
                role,
                locale = "",
                theme = "",
            } = action.payload;

            const normalized = normalizeAuthRolePayload({
                role,
                roles,
                permissions,
                rolePermissions,
            });

            state.token = token;
            state.email = email;
            state.permissions = normalized.permissions;
            state.firstName = firstName;
            state.lastName = lastName;
            state.role = normalized.role;
            state.locale = locale;
            state.theme = theme;
            state.roles = normalized.roles;
            state.rolePermissions = normalized.rolePermissions;
            state.isAuthenticated = !!token;

            authStorage.save({
                token,
                email,
                firstName,
                lastName,
                role: normalized.role,
                locale,
                theme,
                roles: normalized.roles,
                permissions: normalized.permissions,
                rolePermissions: normalized.rolePermissions,
            });
        },
        setLocale: (state, action: PayloadAction<string>) => {
            state.locale = action.payload;
            if (action.payload) {
                localStorage.setItem("locale", action.payload);
            }
        },
        setTheme: (state, action: PayloadAction<string>) => {
            state.theme = action.payload;
            if (action.payload) {
                localStorage.setItem("themePreference", action.payload);
            }
        },
        updateProfile: (state, action: PayloadAction<{ firstName: string; lastName?: string }>) => {
            const { firstName, lastName } = action.payload;
            state.firstName = firstName || "";
            state.lastName = lastName || "";
            localStorage.setItem("firstName", firstName || "");
            localStorage.setItem("lastName", lastName || "");
        },
        setLogout: (state) => {
            state.token = "";
            state.email = "";
            state.firstName = "";
            state.lastName = "";
            state.role = "";
            state.locale = "";
            state.theme = "";
            state.roles = [];
            state.permissions = [];
            state.rolePermissions = {};
            state.isAuthenticated = false;
            authStorage.clear();
        },
    },
});

export const { setLogin, setLogout, setLocale, setTheme, updateProfile } = authSlice.actions;
export default authSlice.reducer;
