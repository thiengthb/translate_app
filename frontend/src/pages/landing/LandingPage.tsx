import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { CherryLoginForm } from "./CherryLoginForm";
import { CherryRegisterForm } from "./CherryRegisterForm";
import { CherryForgotForm } from "./CherryForgotForm";
import { CherryPetals } from "./CherryPetals";

import "./cherry-login.css";

type Mode = "login" | "register" | "forgot";

/**
 * Landing = login/register page, rebuilt from the cherry-blossom-site template.
 * Login and register now live on the page itself behind a segmented tab switch
 * (no popup modal) with a soft slide/fade between them. Falling petals use the
 * original cropped petal sprites (see {@link CherryPetals}).
 */
export default function LandingPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [mode, setMode] = useState<Mode>("login");
    const [loginError, setLoginError] = useState<string | undefined>();

    // This screen is mounted at /login and /register (and still supports the
    // legacy /?auth=… flag). Pick the tab from the path, and surface any
    // ?error from the OAuth failure callback (/login?error=…).
    useEffect(() => {
        const path = window.location.pathname;
        const auth = searchParams.get("auth");
        const err = searchParams.get("error");
        if (auth === "register" || path === "/register") {
            setMode("register");
        }
        if (err) setLoginError(err);
        if (auth || err) {
            searchParams.delete("auth");
            searchParams.delete("error");
            setSearchParams(searchParams, { replace: true });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="cherry-body">
            {/* Brand logo (girl + "Hanabun" wordmark) pinned to the top-left
                viewport corner. The PNG has a TRANSPARENT background so it melts
                straight into the sakura page — no white plate behind it. A soft
                drop-shadow lifts it off the pink. Viewport-anchored sibling of
                the stage (z-index 3) so it stacks above the draping branch; on
                mobile it collapses to a centered logo (see the media query). */}
            <img
                className="cherry-logo"
                src="/hanabun-logo-full.png"
                alt="Hanabun — học tiếng Nhật"
                draggable={false}
            />

            <main className="cherry-stage">
                {/* Top marketing nav — INSIDE the stage so it uses the same
                    %-of-canvas coordinates as the reference template (its nav
                    row starts at left 46.147%, top 12.58%, ≈5% gaps between
                    items). Styled to match the reference art: small uppercase
                    Quicksand, wide tracking, active item bold + darker. */}
                <nav className="cherry-nav" aria-label="Điều hướng">
                    <Link to="/tra-cuu" className="cherry-nav-link">Tra cứu</Link>
                    <Link to="/showcase" className="cherry-nav-link">Giới thiệu</Link>
                    <Link to="/portfolio" className="cherry-nav-link">Về chúng tôi</Link>
                </nav>

                {/* ── Decorative artwork (positions identical to the template) ── */}
                <img className="deco" style={{ left: "8.871%", top: "13.376%", width: "48.2%" }} src="/cherry/photo.webp" alt="" draggable={false} />
                <img className="deco" style={{ left: "4.749%", top: "28.662%", width: "9.899%" }} src="/cherry/cloud.png" alt="" draggable={false} />
                <img className="deco" style={{ left: "84.409%", top: "44.108%", width: "10.546%" }} src="/cherry/chibi.png" alt="" draggable={false} />

                {/* ── Right column: tagline / heading / auth forms ── */}
                <section className="cherry-panel">
                    <p className="cherry-tagline">Mỗi ngày một cánh hoa</p>
                    <h1 className="cherry-heading">
                        {mode === "login"
                            ? "Chào mừng trở lại!"
                            : mode === "register"
                              ? "Tạo tài khoản"
                              : "Quên mật khẩu?"}
                    </h1>
                    {mode === "login" && (
                        <p className="cherry-sub">
                            Đăng nhập để tiếp tục hành trình tiếng Nhật của bạn — flashcard,
                            kanji và bài luyện đang chờ nở rộ.
                        </p>
                    )}
                    {mode === "forgot" && (
                        <p className="cherry-sub">
                            Nhập email, chúng tôi sẽ gửi link đặt lại mật khẩu cho bạn.
                        </p>
                    )}

                    {/* Segmented tab switch — only for the login/register pair.
                        (pill position driven inline so it reliably wins the
                        cascade & animates via CSS transition). */}
                    {mode !== "forgot" && (
                        <div className="cherry-tabs" data-mode={mode}>
                            <span
                                className="cherry-tabs-pill"
                                style={{ left: mode === "register" ? "50%" : "1.6%" }}
                            />
                            <button type="button" data-active={mode === "login"} onClick={() => setMode("login")}>
                                Đăng nhập
                            </button>
                            <button type="button" data-active={mode === "register"} onClick={() => setMode("register")}>
                                Đăng ký
                            </button>
                        </div>
                    )}

                    {/* Forms crossfade/slide when the mode changes (keyed remount). */}
                    <div className="cherry-formwrap" key={mode}>
                        {mode === "login" ? (
                            <CherryLoginForm
                                initialError={loginError}
                                onForgot={() => setMode("forgot")}
                            />
                        ) : mode === "register" ? (
                            <CherryRegisterForm />
                        ) : (
                            <CherryForgotForm onBack={() => setMode("login")} />
                        )}
                    </div>

                    <p className="cherry-register">
                        {mode === "login" ? (
                            <>
                                Chưa có tài khoản?{" "}
                                <button type="button" className="cherry-link" onClick={() => setMode("register")}>
                                    Đăng ký miễn phí
                                </button>
                            </>
                        ) : mode === "register" ? (
                            <>
                                Đã có tài khoản?{" "}
                                <button type="button" className="cherry-link" onClick={() => setMode("login")}>
                                    Đăng nhập
                                </button>
                            </>
                        ) : (
                            <>
                                Nhớ ra mật khẩu rồi?{" "}
                                <button type="button" className="cherry-link" onClick={() => setMode("login")}>
                                    Đăng nhập
                                </button>
                            </>
                        )}
                    </p>
                </section>
            </main>

            {/* Cherry branches anchored to the viewport edges (sway gently). */}
            <img className="cherry-branch-top" src="/cherry/branch_top.png" alt="" draggable={false} />
            <img className="cherry-branch-bottom" src="/cherry/branch_bottom.png" alt="" draggable={false} />

            {/* Randomised falling petals across the whole viewport. */}
            <CherryPetals />
        </div>
    );
}
