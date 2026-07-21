import { folderApi } from "@/api";
import {
  auditableFieldsSchema,
  type EntityConfig,
  type EntitySchema,
  type FieldSchema,
} from "@/types";

const folderSchema: EntitySchema = {
  entityName: "folder",
  idField: "id",
  fields: [
    {
      name: "name",
      label: "Tên",
      type: "text",
      sortable: true,
      bold: true,
      filterable: true,
      filterType: "text",
    },
    {
      name: "userId",
      label: "Người dùng",
      type: "number",
      sortable: true,
      filterable: true,
      filterType: "text",
    },
    {
      name: "description",
      label: "Mô tả",
      type: "textarea",
      sortable: false,
    },
    ...(auditableFieldsSchema as FieldSchema[]),
  ],
};

export const entityConfig: EntityConfig = {
  name: "Thư mục",
  path: "/folders",
  api: folderApi,
  schema: folderSchema,
};
