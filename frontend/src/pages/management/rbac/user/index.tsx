import { userApi } from "@/api";
import { roleApi } from "@/api/features/rbac/role.api";
import {
  auditableFieldsSchema,
  type EntityConfig,
  type EntitySchema,
  type FieldSchema,
} from "@/types";

const userSchema: EntitySchema = {
  entityName: "user",
  idField: "id",
  fields: [
    {
      name: "email",
      label: "Email",
      type: "text",
      sortable: true,
      bold: true,
    },
    {
      name: "firstName",
      label: "Tên",
      type: "text",
      sortable: true,
    },
    {
      name: "lastName",
      label: "Họ",
      type: "text",
      sortable: true,
    },
    {
      name: "password",
      label: "Mật khẩu",
      type: "password",
      visible: false,
      hideable: false,
    },
    {
      name: "roleIds",
      label: "Vai trò",
      type: "relation",
      relation: {
        api: roleApi,
        valueField: "id",
        labelField: "name",
        multiple: true,
      },
      filterable: true,
      filterType: "select",
    },
    ...(auditableFieldsSchema as FieldSchema[]),
  ],
};

export const entityConfig: EntityConfig = {
  name: "Người dùng",
  path: "/users",
  api: userApi,
  schema: userSchema,
};
