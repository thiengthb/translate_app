import { languageApi, meaningApi } from "@/api";
import {
  auditableFieldsSchema,
  type EntityConfig,
  type EntitySchema,
  type FieldSchema,
} from "@/types";

const meaningSchema: EntitySchema = {
  entityName: "meaning",
  idField: "id",
  fields: [
    {
      name: "languageId",
      label: "Language",
      type: "relation",
      sortable: false,
      relation: {
        api: languageApi,
        valueField: "id",
        labelField: "name",
        multiple: false,
      },
    },
    {
      name: "languageName",
      label: "Language",
      type: "text",
      sortable: true,
      editable: false,
    },
    {
      name: "name",
      label: "Meaning",
      type: "textarea",
      sortable: true,
      bold: true,
    },
    ...(auditableFieldsSchema as FieldSchema[]),
  ],
};

export const entityConfig: EntityConfig = {
  name: "Meanings",
  path: "/meanings",
  api: meaningApi,
  schema: meaningSchema,
};