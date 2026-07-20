/**
 * Content for the designer-portfolio landing + about pages.
 *
 * Owner: Akira Kuronagi (Nguyễn Đình Ngọc Ân) — sinh viên Kỹ sư Cầu nối tại
 * ĐH FPT, lập trình viên Frontend. Copy sống ở đây (không nhúng trong JSX) để
 * các component đọc như bố cục, không phải văn bản.
 */

export const designer = {
  name: "Akira Kuronagi",
  nameJa: "黒凪 明",
  realName: "Nguyễn Đình Ngọc Ân",
  role: "Kỹ sư Cầu nối · Frontend",
  roleJa: "ブリッジSE",
  based: "Quảng Nam → TP.HCM → 日本",
  // TODO(bạn): thay bằng email thật của bạn.
  email: "ngocan.dev@gmail.com",
  heroLead: "Xây dựng giải pháp kết nối công nghệ và văn hóa.",
  heroSub:
    "Chào bạn, tôi là Akira Kuronagi (Nguyễn Đình Ngọc Ân) — sinh viên ngành Kỹ thuật Phần mềm tại Đại học FPT, chuyên ngành Kỹ sư Cầu nối. Tôi tập trung thiết kế kiến trúc frontend gọn gàng, hiệu quả và đang chuẩn bị hành trang để trở thành cầu nối vững chắc giữa công nghệ Việt Nam và ngành IT Nhật Bản.",
} as const;

// TODO(bạn): thay các liên kết "#" bằng hồ sơ thật của bạn.
export const socials = [
  { label: "GitHub", handle: "@akirakuronagi", href: "#" },
  { label: "LinkedIn", handle: "/ngoc-an", href: "#" },
  { label: "Facebook", handle: "/akira", href: "#" },
  { label: "Email", handle: designer.email, href: `mailto:${designer.email}` },
] as const;

export interface Work {
  index: string; // nhãn thứ tự (tategaki)
  title: string;
  glyph: string; // kanji neo cho phần hình
  gloss: string; // phụ đề công nghệ (Latin)
  summary: string;
  roleTags: string[];
  year: string;
  chip: string; // gợi ý UI trang trí trên panel dự án
  tint: "sakura" | "beni" | "hazakura" | "sumi";
}

export const works: Work[] = [
  {
    index: "作品 01",
    title: "EV Station Rental System",
    glyph: "電",
    gloss: "SWP391 · ReactJS",
    summary:
      "Kiến trúc frontend phát triển trong khuôn khổ đồ án môn học SWP391, tập trung mang lại trải nghiệm tương tác mượt mà cho người dùng.",
    roleTags: ["Lập trình Frontend", "ReactJS"],
    year: "2025",
    chip: "Trạm sạc · sẵn sàng",
    tint: "sakura",
  },
  {
    index: "作品 02",
    title: "OJT — Learning Base",
    glyph: "学",
    gloss: "Product Design · Web",
    summary:
      "Ứng dụng web giáo dục toàn diện: theo dõi điểm danh chính xác, đồng bộ hóa lịch trình và quản lý hiệu quả các ca học lẫn ca làm việc.",
    roleTags: ["Thiết kế Sản phẩm", "Giao diện Web"],
    year: "2026",
    chip: "Điểm danh · hôm nay",
    tint: "hazakura",
  },
];

export interface Step {
  numeral: string; // số Hán — một trình tự có thứ tự thật (thứ tự nét)
  kanji: string;
  romaji: string;
  label: string;
  body: string;
}

/** Quy trình làm việc, kể theo "thứ tự nét" — thứ tự ở đây mang ý nghĩa. */
export const process: Step[] = [
  {
    numeral: "一",
    kanji: "研究",
    romaji: "kenkyū",
    label: "Nghiên cứu",
    body: "Hiểu rõ yêu cầu và người dùng trước khi viết dòng code đầu tiên.",
  },
  {
    numeral: "二",
    kanji: "下書き",
    romaji: "shitagaki",
    label: "Phác thảo",
    body: "Dựng bố cục và luồng thao tác nhanh gọn, trên giấy trước khi lên màn hình.",
  },
  {
    numeral: "三",
    kanji: "制作",
    romaji: "seisaku",
    label: "Lập trình",
    body: "Hiện thực giao diện bằng ReactJS + TypeScript — dữ liệu thật, cảm giác thật.",
  },
  {
    numeral: "四",
    kanji: "推敲",
    romaji: "suikō",
    label: "Tinh chỉnh",
    body: "Trau chuốt hiệu suất, khoảng cách và chi tiết cho tới khi thật mượt.",
  },
];

/** Lĩnh vực chuyên môn. */
export const skills = [
  "Lập trình Web Frontend",
  "Kỹ sư Cầu nối",
  "Phát triển giao diện (UI/UX)",
] as const;

/** Công cụ thường dùng. */
export const tools = ["ReactJS", "TypeScript", "Tailwind CSS", "Redux", "Axios", "Java Core"] as const;
