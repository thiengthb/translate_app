import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { HanabunMark } from "@/components/branding/HanabunLogo";
import { CherryLoginForm } from "./CherryLoginForm";
import { CherryRegisterForm } from "./CherryRegisterForm";
import { CherryPetals } from "./CherryPetals";

import "./cherry-login.css";

type Mode = "login" | "register";

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

    // Arriving via /login?error=... (OAuth failure) or /register redirects.
    useEffect(() => {
        const auth = searchParams.get("auth");
        if (auth === "register") {
            setMode("register");
        } else if (auth === "login") {
            const err = searchParams.get("error");
            if (err) setLoginError(err);
        }
        if (auth) {
            searchParams.delete("auth");
            searchParams.delete("error");
            setSearchParams(searchParams, { replace: true });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="cherry-body">
            <main className="cherry-stage">
                {/* ── Decorative artwork (positions identical to the template) ── */}
                <img className="deco" style={{ left: "8.871%", top: "13.376%", width: "48.2%" }} src="/cherry/photo.webp" alt="" draggable={false} />
                <img className="deco" style={{ left: "4.749%", top: "28.662%", width: "9.899%" }} src="/cherry/cloud.png" alt="" draggable={false} />
                <img className="deco" style={{ left: "84.409%", top: "44.108%", width: "10.546%" }} src="/cherry/chibi.png" alt="" draggable={false} />

                {/* ── Brand circle (logo layer spot) ── */}
                <div className="cherry-brand">
                    <div className="mark">
                        <HanabunMark />
                    </div>
                    <div className="name">HANABUN</div>
                    <div className="name-jp">花文 · học tiếng Nhật</div>
                </div>

                {/* ── Top nav (nav-label layers spot) ── */}
                <nav className="cherry-nav">
                    <Link to="/">Trang chủ</Link>
                    <Link to="/forgot-password">Quên mật khẩu</Link>
                </nav>

                {/* ── Right column: tagline / heading / auth forms ── */}
                <section className="cherry-panel">
                    <p className="cherry-tagline">Mỗi ngày một cánh hoa</p>
                    <h1 className="cherry-heading">
                        {mode === "login" ? "Chào mừng trở lại!" : "Tạo tài khoản"}
                    </h1>
                    {mode === "login" && (
                        <p className="cherry-sub">
                            Đăng nhập để tiếp tục hành trình tiếng Nhật của bạn — flashcard,
                            kanji và bài luyện đang chờ nở rộ.
                        </p>
                    )}

                    {/* Segmented tab switch (pill position driven inline so it
                        reliably wins the cascade & animates via CSS transition). */}
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

                    {/* Forms crossfade/slide when the mode changes (keyed remount). */}
                    <div className="cherry-formwrap" key={mode}>
                        {mode === "login" ? (
                            <CherryLoginForm initialError={loginError} />
                        ) : (
                            <CherryRegisterForm />
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
                        ) : (
                            <>
                                Đã có tài khoản?{" "}
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
