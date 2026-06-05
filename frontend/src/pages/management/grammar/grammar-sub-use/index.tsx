import { grammarSubUseApi } from "@/api";
import {
  auditableFieldsSchema,
  type EntityConfig,
  type EntitySchema,
  type FieldSchema,
} from "@/types";

const grammarSubUseSchema: EntitySchema = {
  entityName: "grammar_sub_use",
  idField: "id",
  fields: [
    {
      name: "name",
      label: "Tên",
      type: "text",
      sortable: true,
      bold: true,
    },
    {
      name: "jlptLevel",
      label: "Cấp độ JLPT",
      type: "text",
      sortable: true,
      filterable: true,
      filterType: "text",
    },
    {
      name: "detectorKey",
      label: "Detector Key",
      type: "text",
      sortable: true,
    },
    {
      name: "nuanceDescription",
      label: "Mô tả sắc thái",
      type: "textarea",
    },
    ...(auditableFieldsSchema as FieldSchema[]),
  ],
};

export const entityConfig: EntityConfig = {
  name: "Ngữ pháp",
  path: "/grammar-sub-uses",
  api: grammarSubUseApi,
  schema: grammarSubUseSchema,
};
