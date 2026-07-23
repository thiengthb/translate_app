import { moduleApi, moduleGroupApi, permissionApi } from "@/api";
import { iconKeyOptions } from "@/components/datatable/iconMap";
import { auditableFieldsSchema, type EntityConfig, type EntitySchema, type FieldSchema } from "@/types";

const moduleSchema: EntitySchema = {
    entityName: "module",
    idField: "id",
    fields: [
        {
            name: "title",
            label: "Tiêu đề",
            type: "text",
            sortable: true,
            bold: true,
        },
        {
            name: "moduleGroupId",
            label: "Nhóm module",
            type: "relation",
            editable: true,
            relation: {
                api: moduleGroupApi,
                valueField: "id",
                labelField: "name",
            },
            filterable: true,
            filterType: "select",
        },
        {
            name: "url",
            label: "URL",
            type: "text",
            sortable: true,
        },
        {
            name: "icon",
            label: "Biểu tượng",
            type: "icon",
            options: iconKeyOptions,
            filterable: true,
            filterType: "select",
        },
        {
            name: "requiredPermission",
            label: "Quyền yêu cầu",
            type: "relation",
            editable: true,
            relation: {
                api: permissionApi,
                valueField: "name",
                labelField: "name",
            },
            filterable: true,
            filterType: "select",
        },
        {
            name: "displayOrder",
            label: "Thứ tự hiển thị",
            type: "number",
            sortable: true,
        },
        ...(auditableFieldsSchema as FieldSchema[])
    ],
};

export const entityConfig: EntityConfig = {
    name: "Module",
    path: "/menus",
    api: moduleApi,
    schema: moduleSchema,
};
