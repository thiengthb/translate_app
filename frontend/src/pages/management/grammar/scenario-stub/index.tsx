import { scenarioStubApi, grammarSubUseApi } from "@/api";
import {
  auditableFieldsSchema,
  type EntityConfig,
  type EntitySchema,
  type FieldSchema,
} from "@/types";

const scenarioStubSchema: EntitySchema = {
  entityName: "scenario_stub",
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
      name: "situationContext",
      label: "Ngữ cảnh tình huống",
      type: "textarea",
      sortable: false,
      bold: true,
    },
    {
      name: "register",
      label: "Register",
      type: "text",
      sortable: true,
      filterable: true,
      filterType: "text",
    },
    {
      name: "l1PromptTemplate",
      label: "L1 Prompt Template",
      type: "textarea",
      sortable: false,
    },
    ...(auditableFieldsSchema as FieldSchema[]),
  ],
};

export const entityConfig: EntityConfig = {
  name: "Tình huống",
  path: "/scenario-stubs",
  api: scenarioStubApi,
  schema: scenarioStubSchema,
};
