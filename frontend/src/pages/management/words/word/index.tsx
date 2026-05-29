import { wordApi, representationApi, levelApi } from "@/api";
import {
  auditableFieldsSchema,
  type EntityConfig,
  type EntitySchema,
  type FieldSchema,
} from "@/types";

const wordSchema: EntitySchema = {
  entityName: "word",
  idField: "id",
  fields: [
    {
      name: "word",
      label: "Word",
      type: "text",
      sortable: true,
      bold: true,
    },
    {
      name: "reading",
      label: "Reading",
      type: "text",
      sortable: true,
    },
    {
      name: "wordType",
      label: "Word Type",
      type: "text",
      sortable: true,
      filterable: true,
      filterType: "text",
    },
    {
      name: "frequency",
      label: "Frequency",
      type: "number",
      sortable: true,
    },
    {
      name: "representationId",
      label: "Representation",
      type: "relation",
      relation: {
        api: representationApi,
        valueField: "id",
        labelField: "name",
        multiple: false,
      },
    },
    {
      name: "meaningText",
      label: "Meaning",
      type: "text",
      sortable: false,
      editable: false,
    },
    {
      name: "levelId",
      label: "Level",
      type: "relation",
      relation: {
        api: levelApi,
        valueField: "id",
        labelField: "name",
        multiple: false,
      },
    },
    ...(auditableFieldsSchema as FieldSchema[]),
  ],
};

export const entityConfig: EntityConfig = {
  name: "Words",
  path: "/words",
  api: wordApi,
  schema: wordSchema,
  createRoute: "/words/create",
};