import { wordTypeApi } from "@/api";
import {
  auditableFieldsSchema,
  type EntityConfig,
  type EntitySchema,
  type FieldSchema,
} from "@/types";

const wordTypeSchema: EntitySchema = {
  entityName: "wordType",
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
    {
      name: "description",
      label: "Description",
      type: "text",
    },
    ...(auditableFieldsSchema as FieldSchema[]),
  ],
};

export const entityConfig: EntityConfig = {
  name: "Word Types",
  path: "/word-types",
  api: wordTypeApi,
  schema: wordTypeSchema,
};
