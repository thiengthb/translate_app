import { languageApi } from "@/api";
import {
  auditableFieldsSchema,
  type EntityConfig,
  type EntitySchema,
  type FieldSchema,
} from "@/types";

const languageSchema: EntitySchema = {
  entityName: "language",
  idField: "id",
  fields: [
    {
      name: "code",
      label: "Code",
      type: "text",
      sortable: true,
      bold: true,
    },
    {
      name: "name",
      label: "Name",
      type: "text",
      sortable: true,
    },
    ...(auditableFieldsSchema as FieldSchema[]),
  ],
};

export const entityConfig: EntityConfig = {
  name: "Languages",
  path: "/languages",
  api: languageApi,
  schema: languageSchema,
};