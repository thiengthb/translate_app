import {
    createContext,
    useContext,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
    type MutableRefObject,
    type ReactNode,
} from "react";

/**
 * Per-page shell configuration. Historically these were props passed
 * straight to `<MainLayout>`, which used to render the ENTIRE sidebar/header
 * shell itself on every page. Since `<Routes>` unmounts a page's whole
 * subtree on navigation, that meant the shell (and anything inside it, like
 * `WritingQuoteHeader`'s rotating-quote timer) got destroyed and recreated on
 * every route change — the quote's animation/timer glitched on every nav.
 *
 * The shell now lives ONCE, above `<Outlet />` (see `PersistentAppShell` in
 * MainLayout.tsx, mounted via a layout `<Route>` in App.tsx). Pages still
 * call `<MainLayout {...options}>{children}</MainLayout>` exactly as before
 * — MainLayout is now a thin shim that forwards `options` here instead of
 * rendering the shell itself. No page file needs to change.
 *
 * Two different sync strategies are used, deliberately:
 *
 *   - STRUCTURAL flags (`focus`, `focusTitle`, `pageScroll`, `hasSidePanel`)
 *     decide WHICH shell markup the ancestor renders, so they must reach it
 *     via state. They're all primitives, so a `useLayoutEffect` gated on
 *     `[focus, focusTitle, pageScroll, hasSidePanel]` only re-fires when the
 *     VALUE actually changes — safe against loops even though the page
 *     re-renders (and rebuilds the config object) far more often than that.
 *
 *   - CONTENT slots (`headerExtra`, `sidePanel`) are arbitrary ReactNode —
 *     several pages rebuild them every render (live tabs, dashboard widgets),
 *     so syncing them through state would re-trigger the effect above forever
 *     (state update → shell's descendants re-render → page rebuilds the
 *     node → new effect run → state update → ...). Portals avoid the loop
 *     entirely: MainLayout renders them straight into host `<div>`s owned by
 *     the shell, exactly like normal child rendering — no state, no effect,
 *     no indirection, updates every render for free.
 */
export interface LayoutStructuralConfig {
    /** Distraction-free mode: FocusShell instead of the sidebar shell. */
    focus?: boolean;
    /** FocusShell header title (MainLayout derives this from `pathName`). */
    focusTitle?: string;
    /** Whole-document scroll vs the default fixed-viewport internal scroll. */
    pageScroll?: boolean;
    /** Whether the current page wants the side-panel column reserved. */
    hasSidePanel?: boolean;
}

const DEFAULT_STRUCTURAL: LayoutStructuralConfig = {};

interface LayoutConfigContextValue {
    structural: LayoutStructuralConfig;
    setStructural: (config: LayoutStructuralConfig) => void;
    onBackRef: MutableRefObject<(() => void) | undefined>;
    headerExtraHost: HTMLDivElement | null;
    setHeaderExtraHost: (el: HTMLDivElement | null) => void;
    sidePanelHost: HTMLDivElement | null;
    setSidePanelHost: (el: HTMLDivElement | null) => void;
}

const LayoutConfigContext = createContext<LayoutConfigContextValue | null>(null);

export function LayoutConfigProvider({ children }: { children: ReactNode }) {
    const [structural, setStructural] = useState<LayoutStructuralConfig>(DEFAULT_STRUCTURAL);
    const onBackRef = useRef<(() => void) | undefined>(undefined);
    // Plain useState (not useRef) as the ref CALLBACK target — a callback ref
    // that calls setState fires exactly once when the host <div> commits,
    // giving portals a real DOM node to target without polling.
    const [headerExtraHost, setHeaderExtraHost] = useState<HTMLDivElement | null>(null);
    const [sidePanelHost, setSidePanelHost] = useState<HTMLDivElement | null>(null);

    const value = useMemo<LayoutConfigContextValue>(
        () => ({
            structural,
            setStructural,
            onBackRef,
            headerExtraHost,
            setHeaderExtraHost,
            sidePanelHost,
            setSidePanelHost,
        }),
        [structural, headerExtraHost, sidePanelHost],
    );

    return (
        <LayoutConfigContext.Provider value={value}>{children}</LayoutConfigContext.Provider>
    );
}

function useLayoutConfigContext(): LayoutConfigContextValue {
    const ctx = useContext(LayoutConfigContext);
    if (!ctx) {
        throw new Error("useLayoutConfigContext must be used within a LayoutConfigProvider");
    }
    return ctx;
}

/** Read by the persistent shell to pick FocusShell vs AppShell, scroll model, etc. */
export function useLayoutStructural(): LayoutStructuralConfig {
    return useLayoutConfigContext().structural;
}

/**
 * Called by `<MainLayout>` on every render to publish its structural flags.
 * Gated on primitive values only (see file-level doc) — safe against loops.
 */
export function useRegisterStructuralConfig(config: LayoutStructuralConfig) {
    const { setStructural } = useLayoutConfigContext();
    useLayoutEffect(() => {
        setStructural(config);
        return () => setStructural(DEFAULT_STRUCTURAL);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [config.focus, config.focusTitle, config.pageScroll, config.hasSidePanel]);
}

/**
 * Called by `<MainLayout>` on every render to publish the active page's
 * `onBack` handler. A ref write never re-renders anything, so this is safe
 * to run every render — it's just always the most up-to-date value, no
 * gating needed.
 */
export function useRegisterOnBack(onBack: (() => void) | undefined) {
    const { onBackRef } = useLayoutConfigContext();
    useLayoutEffect(() => {
        onBackRef.current = onBack;
    });
}

/**
 * Read-only accessor for the shell (FocusShell reads `.current` at click
 * time). Deliberately does NOT write to the ref — React fires a CHILD's
 * layout effects before its PARENT's in the same commit, so if the shell
 * (an ancestor of `<MainLayout>`) also wrote here, it would run after and
 * clobber the page's real handler with whatever it was called with.
 */
export function useOnBackRefValue(): MutableRefObject<(() => void) | undefined> {
    return useLayoutConfigContext().onBackRef;
}

/** Portal targets — read by MainLayout (to portal into) and by the
 *  persistent shell (to render the host <div>s the portals target). */
export function useLayoutHosts() {
    const { headerExtraHost, setHeaderExtraHost, sidePanelHost, setSidePanelHost } =
        useLayoutConfigContext();
    return { headerExtraHost, setHeaderExtraHost, sidePanelHost, setSidePanelHost };
}
