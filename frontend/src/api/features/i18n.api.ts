import axiosInstance from "../axios";

// ---- API ----

export const i18nApi = {
  getTranslations: async (
    locale: string,
    category?: string,
  ): Promise<Record<string, string>> => {
    const params: Record<string, string> = {};
    if (category) params.category = category;

    const response = await axiosInstance.get<Record<string, string>>(
      `/i18n/${locale}`,
      { params },
    );
    return response.data;
  },
};
