import { permissionApi } from "@/api";
import {
  auditableFieldsSchema,
  type EntityConfig,
  type EntitySchema,
  type FieldSchema,
} from "@/types";

const permissionSchema: EntitySchema = {
  entityName: "permission",
  idField: "id",
  fields: [
    {
      name: "name",
      label: "Tên",
      type: "text",
      sortable: true,
      bold: true,
    },
    {
      name: "description",
      label: "Mô tả",
      type: "textarea",
      sortable: true,
    },
    {
      name: "resource",
      label: "Tài nguyên",
      type: "text",
      sortable: true,
      filterable: true,
    },
    {
      name: "action",
      label: "Hành động",
      type: "text",
      sortable: true,
      filterable: true,
    },
    ...(auditableFieldsSchema as FieldSchema[]),
  ],
};

export const entityConfig: EntityConfig = {
  name: "Quyền hạn",
  path: "/permissions",
  api: permissionApi,
  schema: permissionSchema,
};
