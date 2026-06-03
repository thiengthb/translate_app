import { downloadBlob, getFilenameFromHeader } from "@/components/datatable/util/dataio.utils";
import axiosInstance from "../../axios";

export const downloadTemplate = async (entity: string) => {
    // Từ vựng có template riêng (kèm sheet hướng dẫn + ví dụ mẫu) vì cấu trúc
    // phức tạp — nghĩa đa ngôn ngữ và ví dụ gộp trong một ô.
    const url =
        entity === "word"
            ? `/dictionary/words/template`
            : `/import/template?entity=${entity}`;
    const res = await axiosInstance.get(url, {
        responseType: "blob",
    });

    const contentDisposition = res.headers["content-disposition"];
    const filename = getFilenameFromHeader(contentDisposition);

    const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    downloadBlob(blob, filename || undefined);
};
