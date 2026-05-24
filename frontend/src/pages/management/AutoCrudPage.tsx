import { ProTable } from "@/components/datatable/ProTable";
import { MainLayout } from "@/components/layout/MainLayout";
import { useProTable } from "@/components/datatable/hook/useProTable";

export const AutoCrudPage = ({ entity }: any) => {

    const table = useProTable(entity.api, entity.schema);

    return (
        <MainLayout pathName={{ [entity.path]: entity.name }}>
            <ProTable table={table} />
        </MainLayout>
    );
};