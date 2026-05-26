import { levelApi } from "@/api";
import {
  auditableFieldsSchema,
  type EntityConfig,
  type EntitySchema,
  type FieldSchema,
} from "@/types";

const levelSchema: EntitySchema = {
  entityName: "level",
  idField: "id",
  fields: [
    {
      name: "name",
      label: "Name",
      type: "text",
      sortable: true,
      bold: true,
    },
    {
      name: "code",
      label: "Code",
      type: "text",
      sortable: true,
    },
    ...(auditableFieldsSchema as FieldSchema[]),
  ],
};

export const entityConfig: EntityConfig = {
  name: "Levels",
  path: "/levels",
  api: levelApi,
  schema: levelSchema,
};
