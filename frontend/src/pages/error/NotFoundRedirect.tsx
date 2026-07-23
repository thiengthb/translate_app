import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "@/store/store";
import { useActiveModuleGroups } from "@/hooks/useSidebarMenus";

export const NotFoundRedirect = () => {
  const location = useLocation();
  const { isAuthenticated } = useSelector(
    (state: RootState) => state.auth
  );

  const { isLoading } = useActiveModuleGroups(isAuthenticated);

  if (isLoading) {
    return null;
  }

  const requestedPath = `${location.pathname}${location.search}${location.hash}`;

  // Guests get a real 404 (a public page), never a bounce to the auth screen —
  // the Mazii open-access model keeps them where they are unless they choose
  // to sign in.
  if (!isAuthenticated) {
    return <Navigate to="/not-found-page" replace state={{ requestedPath }} />;
  }

  return (
    <Navigate
      to="/not-found-page"
      replace
      state={{ requestedPath }}
    />
  );
};
