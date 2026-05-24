import axiosInstance from "../axios";

// ---- Types ----

export interface FieldMetadata {
  name: string;
  label: string;
  type: string;
  uiType: string;
  required: boolean;
  hidden: boolean;
  readOnly: boolean;
  sortable: boolean;
  filterable: boolean;
  searchable: boolean;
  placeholder: string;
  order: number;
  minLength: number;
  maxLength: number;
  min: number | null;
  max: number | null;
  pattern: string;
  group: string;
  description: string;
  enumValues: string[] | null;
  relation: {
    entity: string;
    displayField: string;
    type: string;
  } | null;
  validation: {
    notNull: boolean;
    notBlank: boolean;
    unique: boolean;
    min: number | null;
    max: number | null;
    pattern: string | null;
    message: string | null;
  } | null;
}

export interface EntityMetadata {
  entityName: string;
  label: string;
  pluralLabel: string;
  description: string;
  apiPath: string;
  resource: string;
  fields: FieldMetadata[];
  searchableFields: string[];
  filterableFields: string[];
  sortableFields: string[];
  permissions: {
    resource: string;
    create: string;
    read: string;
    update: string;
    delete: string;
  } | null;
  menu: {
    title: string;
    group: string;
    icon: string;
    url: string;
    order: number;
    permission: string;
  } | null;
  crud: {
    enableExport: boolean;
    enableImport: boolean;
    enableBulkDelete: boolean;
    path: string;
  } | null;
  features: Record<string, any>;
}

// ---- API ----

export const metadataApi = {
  getAll: async (): Promise<EntityMetadata[]> => {
    const response = await axiosInstance.get<EntityMetadata[]>("/meta/entities");
    return response.data;
  },

  getByName: async (name: string): Promise<EntityMetadata> => {
    const response = await axiosInstance.get<EntityMetadata>(`/meta/entities/${name}`);
    return response.data;
  },
};
