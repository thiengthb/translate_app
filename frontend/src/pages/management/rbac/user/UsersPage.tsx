import { useSearchParams } from "react-router-dom";

import { MainLayout } from "@/components/layout/MainLayout";
import { ProTable } from "@/components/datatable/ProTable";
import { useProTable } from "@/components/datatable/hook/useProTable";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserAnalyticsContent } from "@/pages/admin/userDashboard/UserAnalyticsContent";

import { entityConfig } from "./index";

type TabValue = "manage" | "analytic";

const VALID_TABS: TabValue[] = ["manage", "analytic"];

/**
 * Unified `/users` page that fuses the User CRUD table with the User
 * analytics dashboard behind two tabs:
 *
 *   [Quản lý] — ProTable for the `users` entity (CRUD + bulk + filters)
 *   [Analytic] — summary cards, growth chart, role distribution, etc.
 *
 * The tab control lives in the top bar next to the breadcrumbs (via
 * MainLayout's `headerExtra` slot) so it sits at chrome level rather
 * than stealing page space. State is URL-backed (`?tab=analytic`) — a
 * shared / bookmarked link lands on the right tab and refresh keeps it.
 */
export default function UsersPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const rawTab = searchParams.get("tab") as TabValue | null;
    const tab: TabValue = rawTab && VALID_TABS.includes(rawTab) ? rawTab : "manage";

    const setTab = (next: TabValue) => {
        const params = new URLSearchParams(searchParams);
        if (next === "manage") params.delete("tab");
        else params.set("tab", next);
        setSearchParams(params, { replace: true });
    };

    const tabsControl = (
        <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
            <TabsList>
                <TabsTrigger value="manage">Quản lý</TabsTrigger>
                <TabsTrigger value="analytic">Phân tích</TabsTrigger>
            </TabsList>
        </Tabs>
    );

    return (
        <MainLayout
            pathName={{ "/users": "Người dùng" }}
            headerExtra={tabsControl}
        >
            {tab === "manage" ? <ManageTab /> : <UserAnalyticsContent />}
        </MainLayout>
    );
}

// ─── Manage tab: the User CRUD ProTable ─────────────────────────────────────
function ManageTab() {
    const table = useProTable(entityConfig.api, entityConfig.schema);
    return (
        <div className="w-full flex-1 min-h-0 flex flex-col min-w-0">
            <ProTable table={table} />
        </div>
    );
}
