import { grammarApi, levelApi } from "@/api";
import {
  auditableFieldsSchema,
  type EntityConfig,
  type EntitySchema,
  type FieldSchema,
} from "@/types";

const grammarSchema: EntitySchema = {
  entityName: "grammar",
  idField: "id",
  fields: [
    {
      name: "form",
      label: "Biểu thức",
      type: "text",
      sortable: true,
      bold: true,
    },
    {
      name: "slug",
      label: "Đường dẫn",
      type: "text",
      sortable: true,
    },
    {
      name: "levelId",
      label: "Cấp độ JLPT",
      type: "relation",
      relation: {
        api: levelApi,
        valueField: "id",
        labelField: "code",
        multiple: false,
      },
    },
    {
      name: "titleGloss",
      label: "Nghĩa tóm tắt",
      type: "textarea",
    },
    {
      name: "notes",
      label: "Chú ý",
      type: "textarea",
    },
    ...(auditableFieldsSchema as FieldSchema[]),
  ],
};

export const entityConfig: EntityConfig = {
  name: "Biểu thức ngữ pháp",
  path: "/grammars",
  api: grammarApi,
  schema: grammarSchema,
};
