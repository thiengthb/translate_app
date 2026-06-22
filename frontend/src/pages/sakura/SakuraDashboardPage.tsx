import { useNavigate } from "react-router-dom";

import { SakuraStudyDashboard } from "@/components/sakura-dashboard/SakuraStudyDashboard";
import { defaultSakuraData } from "@/components/sakura-dashboard/sakura-dashboard.types";

/**
 * Standalone host for the Sakura Study Dashboard design.
 *
 * The dashboard is a full-screen shell that ships its own sidebar, so it is
 * rendered on its own (NOT inside MainLayout, which would double the sidebar).
 * `defaultSakuraData` provides the first-render sample content from the design
 * handoff — swap it for real data once the prop shape matches.
 */
export default function SakuraDashboardPage() {
  const navigate = useNavigate();

  return (
    <SakuraStudyDashboard
      {...defaultSakuraData}
      onReturn={() => navigate(-1)}
      onNavigate={(key) => navigate(`/${key}`)}
    />
  );
}
