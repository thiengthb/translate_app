import { kanjiApi } from "@/api";
import {
  auditableFieldsSchema,
  type EntityConfig,
  type EntitySchema,
  type FieldSchema,
} from "@/types";

const kanjiSchema: EntitySchema = {
  entityName: "kanji",
  idField: "id",
  fields: [
    {
      name: "character",
      label: "Character",
      type: "text",
      sortable: true,
      bold: true,
    },
    {
      name: "onyomi",
      label: "Onyomi",
      type: "text",
      sortable: true,
    },
    {
      name: "kunyomi",
      label: "Kunyomi",
      type: "text",
      sortable: true,
    },
    {
      name: "meaning",
      label: "Meaning",
      type: "textarea",
      sortable: true,
    },
    {
      name: "jlptLevel",
      label: "JLPT Level",
      type: "text",
      sortable: true,
      filterable: true,
      filterType: "text",
    },
    {
      name: "stroke",
      label: "Stroke Count",
      type: "number",
      sortable: true,
    },
    {
      name: "radical",
      label: "Radical",
      type: "text",
      sortable: true,
    },
    ...(auditableFieldsSchema as FieldSchema[]),
  ],
};

export const entityConfig: EntityConfig = {
  name: "Kanjis",
  path: "/kanjis",
  api: kanjiApi,
  schema: kanjiSchema,
};