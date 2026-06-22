import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

import { SakuraStudyDashboard } from "@/components/sakura-dashboard/SakuraStudyDashboard";
import { defaultSakuraData } from "@/components/sakura-dashboard/sakura-dashboard.types";
import { useLogout } from "@/hooks/useLogout";
import type { RootState } from "@/store/store";

/**
 * Home dashboard — renders the full-screen Sakura study dashboard design
 * (its own candy sidebar, no app top bar). The greeting uses the logged-in
 * user's name; the rest is sample data (`defaultSakuraData`) until real
 * study endpoints are wired. Identical surface to `/sakura-dashboard`.
 */
export function Dashboard() {
    const navigate = useNavigate();
    const logout = useLogout();
    const { firstName, lastName, email } = useSelector(
        (s: RootState) => s.auth,
    );

    const name =
        [firstName, lastName].filter(Boolean).join(" ").trim() ||
        email?.split("@")[0] ||
        defaultSakuraData.user.name;

    return (
        <SakuraStudyDashboard
            {...defaultSakuraData}
            user={{ ...defaultSakuraData.user, name }}
            onReturn={() => navigate(-1)}
            onNavigate={(key) => {
                if (key === "home") navigate("/dashboard");
            }}
            onPower={() => void logout()}
        />
    );
}
