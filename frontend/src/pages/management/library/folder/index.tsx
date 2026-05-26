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
      label: "Name",
      type: "text",
      sortable: true,
      bold: true,
      filterable: true,
      filterType: "text",
    },
    {
      name: "userId",
      label: "User",
      type: "number",
      sortable: true,
      filterable: true,
      filterType: "text",
    },
    {
      name: "description",
      label: "Description",
      type: "textarea",
      sortable: false,
    },
    ...(auditableFieldsSchema as FieldSchema[]),
  ],
};

export const entityConfig: EntityConfig = {
  name: "Folder",
  path: "/folders",
  api: folderApi,
  schema: folderSchema,
};
