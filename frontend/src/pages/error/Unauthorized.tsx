import type { RootState } from "@/store/store";
import { usePermissions } from "@/hooks/usePermissions";
import { getHomePathByRole } from "@/utils/rbac.utils";
import { useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";

interface UnauthorizedProps {
  isAuthenticated?: boolean;
}

export const Unauthorized = ({ isAuthenticated }: UnauthorizedProps) => {
  const navigate = useNavigate();
  const { isAuthenticated: authState, role } = useSelector((state: RootState) => state.auth);
  const { activeRole } = usePermissions();
  const resolvedAuth = isAuthenticated ?? authState;
  const homePath = getHomePathByRole(activeRole ?? role);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <h1 className="text-7xl font-bold text-destructive">403</h1>

      <p className="mt-4 text-xl font-semibold">Không có quyền truy cập</p>

      <p className="mt-2 max-w-md text-muted-foreground">
        Bạn không có quyền truy cập trang này.
        Vui lòng quay lại hoặc chuyển đến một trang bạn có quyền truy cập.
      </p>

      <div className="mt-6 flex gap-3">
        {resolvedAuth ? (
          <Link
            to={homePath}
            className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Về trang chủ
          </Link>
        ) : (
          <Link
            to="/login"
            className="rounded-md border px-5 py-2 text-sm font-medium hover:bg-muted"
          >
            Quay lại đăng nhập
          </Link>
        )}

        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded-md border px-5 py-2 text-sm font-medium hover:bg-muted"
        >
          Quay lại
        </button>
      </div>
    </div>
  );
};
