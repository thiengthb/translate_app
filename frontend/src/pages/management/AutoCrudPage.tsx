import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { ProTable } from "@/components/datatable/ProTable";
import { MainLayout } from "@/components/layout/MainLayout";
import { useProTable } from "@/components/datatable/hook/useProTable";
import ActionButton from "@/components/datatable/common/ActionButton";
import { PermissionGate } from "@/components/PermissionGate";

export const AutoCrudPage = ({ entity }: any) => {

    const table = useProTable(entity.api, entity.schema);
    const navigate = useNavigate();

    // Khi entity khai báo `createRoute`, nút "Tạo" điều hướng sang trang riêng
    // thay vì mở modal tạo mặc định.
    const createPermission = `${String(entity.schema.entityName || "").toUpperCase()}_CREATE`;
    const headerActions = entity.createRoute ? (
        <PermissionGate permission={createPermission}>
            <ActionButton
                onClick={() => navigate(entity.createRoute)}
                tooltip="Create new data"
                title="Create"
                variant="default"
                icon={<Plus size={16} />}
            />
        </PermissionGate>
    ) : undefined;

    return (
        <MainLayout pathName={{ [entity.path]: entity.name }}>
            <div className="w-full flex-1 min-h-0 flex flex-col min-w-0">
                <ProTable table={table} headerActions={headerActions} />
            </div>
        </MainLayout>
    );
};