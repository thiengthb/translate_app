import { wordKanjiApi, wordApi, kanjiApi } from "@/api";
import {
  auditableFieldsSchema,
  type EntityConfig,
  type EntitySchema,
  type FieldSchema,
} from "@/types";

const wordKanjiSchema: EntitySchema = {
  entityName: "word_kanji",
  idField: "id",
  fields: [
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
      name: "kanjiId",
      label: "Kanji",
      type: "relation",
      relation: {
        api: kanjiApi,
        valueField: "id",
        labelField: "character",
        multiple: false,
      },
    },
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
  name: "Word Kanjis",
  path: "/word-kanjis",
  api: wordKanjiApi,
  schema: wordKanjiSchema,
};