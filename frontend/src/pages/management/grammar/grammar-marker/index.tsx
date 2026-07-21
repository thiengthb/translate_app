import { grammarMarkerApi, grammarSubUseApi } from "@/api";
import {
  auditableFieldsSchema,
  type EntityConfig,
  type EntitySchema,
  type FieldSchema,
} from "@/types";

const grammarMarkerSchema: EntitySchema = {
  entityName: "grammar_marker",
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
      name: "markerPattern",
      label: "Mẫu",
      type: "text",
      sortable: true,
      bold: true,
    },
    {
      name: "register",
      label: "Văn phong",
      type: "text",
      sortable: true,
      filterable: true,
      filterType: "text",
    },
    {
      name: "frequencyRank",
      label: "Xếp hạng tần suất",
      type: "number",
      sortable: true,
    },
    {
      name: "detectorSubkey",
      label: "Mã phụ nhận diện",
      type: "text",
      sortable: true,
    },
    ...(auditableFieldsSchema as FieldSchema[]),
  ],
};

export const entityConfig: EntityConfig = {
  name: "Dấu hiệu ngữ pháp",
  path: "/grammar-markers",
  api: grammarMarkerApi,
  schema: grammarMarkerSchema,
};
