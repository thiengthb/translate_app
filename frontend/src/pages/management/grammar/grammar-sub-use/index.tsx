import { grammarSubUseApi, levelApi } from "@/api";
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
      name: "detectorKey",
      label: "Mã nhận diện",
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
