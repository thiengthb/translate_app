import { questionTagApi } from "@/api";
import {
  auditableFieldsSchema,
  type EntityConfig,
  type EntitySchema,
  type FieldSchema,
} from "@/types";

const questionTagSchema: EntitySchema = {
  // "question-tag" → permission resource QUESTION_TAG (matches the backend
  // @ResourcePermission("QUESTION_TAG")). Don't use camelCase here, it would
  // resolve to QUESTIONTAG and hide the CRUD actions.
  entityName: "question-tag",
  idField: "id",
  fields: [
    {
      name: "name",
      label: "Name",
      type: "text",
      sortable: true,
      bold: true,
    },
    {
      name: "code",
      label: "Code",
      type: "text",
      sortable: true,
      filterable: true,
    },
    {
      name: "description",
      label: "Description",
      type: "textarea",
      visible: false,
    },
    ...(auditableFieldsSchema as FieldSchema[]),
  ],
};

export const entityConfig: EntityConfig = {
  name: "Question Tag",
  path: "/question-tags",
  api: questionTagApi,
  schema: questionTagSchema,
};
