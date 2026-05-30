import { referenceSentenceApi, grammarSubUseApi } from "@/api";
import {
  auditableFieldsSchema,
  type EntityConfig,
  type EntitySchema,
  type FieldSchema,
} from "@/types";

const referenceSentenceSchema: EntitySchema = {
  entityName: "reference_sentence",
  idField: "id",
  fields: [
    {
      name: "subUseId",
      label: "Ngữ pháp",
      type: "relation",
      relation: {
        api: grammarSubUseApi,
        valueField: "id",
        labelField: "name",
        multiple: false,
      },
      sortable: false,
    },
    {
      name: "l1Text",
      label: "Câu gốc (L1)",
      type: "textarea",
      sortable: false,
      bold: true,
    },
    {
      name: "l2Text",
      label: "Câu dịch (L2)",
      type: "textarea",
      sortable: false,
    },
    ...(auditableFieldsSchema as FieldSchema[]),
  ],
};

export const entityConfig: EntityConfig = {
  name: "Câu tham chiếu",
  path: "/reference-sentences",
  api: referenceSentenceApi,
  schema: referenceSentenceSchema,
};
