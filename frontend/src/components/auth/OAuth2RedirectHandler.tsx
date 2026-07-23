import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { authApi } from "@/api/features/auth.api";
import { setLogin } from "@/store/slices/auth/authSlice";
import { getHomePathByRole } from "@/utils/rbac.utils";

export const OAuth2RedirectHandler = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();

    useEffect(() => {
        const error = searchParams.get("error");
        const token = searchParams.get("token");

        if (error) {
            navigate("/login?error=google_auth_failed", { replace: true });
            return;
        }

        if (!token) {
            navigate("/login?error=google_token_missing", { replace: true });
            return;
        }

        // The access token no longer carries the user's roles/permissions (kept small so the OAuth
        // redirect's Location header fits nginx's proxy buffers). Persist the token so axios
        // authenticates, then load the authorization payload from /api/me — the same data the
        // password login receives in its own response body.
        localStorage.setItem("token", token);

        authApi
            .getMe()
            .then((me) => {
                dispatch(setLogin({ ...me, token }));
                navigate(getHomePathByRole(me.role), { replace: true });
            })
            .catch(() => {
                localStorage.removeItem("token");
                navigate("/login?error=google_auth_failed", { replace: true });
            });
    }, [searchParams, dispatch, navigate]);

    return (
        <div className="flex h-screen items-center justify-center">
            <p>Processing...</p>
        </div>
    );
};
