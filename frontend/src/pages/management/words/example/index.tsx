import { exampleApi, wordApi, languageApi } from "@/api";
import {
  auditableFieldsSchema,
  type EntityConfig,
  type EntitySchema,
  type FieldSchema,
} from "@/types";

const exampleSchema: EntitySchema = {
  entityName: "example",
  idField: "id",
  fields: [
    {
      name: "rootExample",
      label: "Root Example",
      type: "textarea",
      sortable: true,
      bold: true,
    },
    {
      name: "toExample",
      label: "Translation",
      type: "textarea",
      sortable: true,
    },
    {
      name: "wordId",
      label: "Word",
      type: "relation",
      relation: {
        api: wordApi,
        valueField: "id",
        labelField: "word",
        multiple: false,
      },
    },
    {
      name: "rootLanguageId",
      label: "Root Language",
      type: "relation",
      relation: {
        api: languageApi,
        valueField: "id",
        labelField: "name",
        multiple: false,
      },
    },
    {
      name: "rootLanguageName",
      label: "Root Language",
      type: "text",
      sortable: false,
      editable: false,
    },
    {
      name: "toLanguageId",
      label: "Target Language",
      type: "relation",
      relation: {
        api: languageApi,
        valueField: "id",
        labelField: "name",
        multiple: false,
      },
    },
    {
      name: "toLanguageName",
      label: "Target Language",
      type: "text",
      sortable: false,
      editable: false,
    },
    ...(auditableFieldsSchema as FieldSchema[]),
  ],
};

export const entityConfig: EntityConfig = {
  name: "Examples",
  path: "/examples",
  api: exampleApi,
  schema: exampleSchema,
};