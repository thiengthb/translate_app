package com.example.starter_project_2025.system.words.word;

import com.example.starter_project_2025.base.dataio.importer.result.ImportResult;
import com.example.starter_project_2025.base.dataio.importer.result.RowError;
import com.example.starter_project_2025.system.words.language.LanguageRepository;
import com.example.starter_project_2025.system.words.level.Level;
import com.example.starter_project_2025.system.words.level.LevelRepository;
import com.example.starter_project_2025.system.words.representation.Representation;
import com.example.starter_project_2025.system.words.representation.RepresentationRepository;
import com.opencsv.CSVReader;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Import/Export RIÊNG cho Từ vựng (Word).
 *
 * <p>Word có cấu trúc phức tạp (nhiều nghĩa đa ngôn ngữ + nhiều ví dụ) nên không
 * dùng DataIO generic. Mỗi dòng file = MỘT từ; các nghĩa/ví dụ được "gộp" vào
 * một ô theo cú pháp delimiter (xem template / sheet hướng dẫn).
 *
 * <p>Import tái sử dụng đúng luồng tạo từ {@link WordService#createFull} — cùng
 * transaction, cùng cách tạo meanings/examples như màn hình "Tạo từ vựng".
 */
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class WordDataIoService {

    WordRepository wordRepository;
    WordService wordService;
    RepresentationRepository representationRepository;
    LevelRepository levelRepository;
    LanguageRepository languageRepository;

    // ── Tên cột (đồng bộ template + export + import) ──
    static final String COL_WORD = "Word";
    static final String COL_READING = "Reading";
    static final String COL_WORD_TYPE = "WordType";
    static final String COL_FREQUENCY = "Frequency";
    static final String COL_REPRESENTATION = "Representation";
    static final String COL_LEVEL = "Level";
    static final String COL_MEANINGS = "Meanings";
    static final String COL_EXAMPLES = "Examples";

    static final List<String> HEADERS = List.of(
            COL_WORD, COL_READING, COL_WORD_TYPE, COL_FREQUENCY,
            COL_REPRESENTATION, COL_LEVEL, COL_MEANINGS, COL_EXAMPLES);

    // ── Delimiter cho các ô "gộp" ──
    static final String ITEM_SEP = "|";          // tách nhiều nghĩa / nhiều ví dụ
    static final String MEANING_LANG_SEP = ":";  // mãNgônNgữ : nội dung
    static final String EXAMPLE_ARROW = "=>";    // câu gốc => bản dịch
    static final String DEFAULT_MEANING_LANG = "vi";
    static final String[] JA_CODES = {"ja", "jpn", "jp"};
    static final String[] VI_CODES = {"vi", "vie"};
    static final String SHEET_WORDS = "Words";

    private static final Pattern ITEM_SPLIT = Pattern.compile(Pattern.quote(ITEM_SEP));

    // ═══════════════════════════ EXPORT ═══════════════════════════

    @Transactional(readOnly = true)
    public byte[] export(boolean csv) {
        List<List<String>> rows = new ArrayList<>();
        for (Word w : wordRepository.findAll()) {
            rows.add(toRow(w));
        }
        return csv ? buildCsv(HEADERS, rows) : buildWordsWorkbook(HEADERS, rows);
    }

    private List<String> toRow(Word w) {
        List<String> row = new ArrayList<>();
        row.add(nz(w.getWord()));
        row.add(nz(w.getReading()));
        row.add(nz(w.getWordType()));
        row.add(w.getFrequency() != null ? String.valueOf(w.getFrequency()) : "");
        row.add(w.getRepresentation() != null ? nz(w.getRepresentation().getCode()) : "");
        row.add(w.getLevel() != null ? nz(w.getLevel().getCode()) : "");
        row.add(joinMeanings(w));
        row.add(joinExamples(w));
        return row;
    }

    private String joinMeanings(Word w) {
        if (w.getMeanings() == null) return "";
        List<String> parts = new ArrayList<>();
        for (var m : w.getMeanings()) {
            if (m.getName() == null || m.getName().isBlank()) continue;
            String code = (m.getLanguage() != null && m.getLanguage().getCode() != null)
                    ? m.getLanguage().getCode()
                    : DEFAULT_MEANING_LANG;
            parts.add(code + MEANING_LANG_SEP + " " + m.getName().trim());
        }
        return String.join(" " + ITEM_SEP + " ", parts);
    }

    private String joinExamples(Word w) {
        if (w.getExamples() == null) return "";
        List<String> parts = new ArrayList<>();
        for (var e : w.getExamples()) {
            String root = nz(e.getRootExample());
            String to = nz(e.getToExample());
            if (root.isBlank() && to.isBlank()) continue;
            parts.add(root + " " + EXAMPLE_ARROW + " " + to);
        }
        return String.join(" " + ITEM_SEP + " ", parts);
    }

    // ═══════════════════════════ IMPORT ═══════════════════════════
    // KHÔNG @Transactional ở đây: mỗi dòng commit độc lập qua
    // wordService.createFull (mỗi lần là một transaction riêng). Một dòng lỗi
    // không làm rollback những dòng đã thành công.
    public ImportResult importFile(MultipartFile file) {
        ImportResult result = new ImportResult();

        List<Map<String, String>> rows;
        try {
            rows = parse(file);
        } catch (Exception e) {
            throw new RuntimeException("Không đọc được file: " + rootMessage(e), e);
        }

        int rowIndex = 2; // hàng 1 là tiêu đề
        for (Map<String, String> row : rows) {
            try {
                if (isBlankRow(row)) {
                    rowIndex++;
                    continue;
                }

                // Chống trùng: khoá = (word + reading). Vì mỗi createFull commit
                // riêng, lần kiểm tra này thấy được cả từ đã có sẵn trong DB lẫn
                // từ vừa được nhập ở các dòng trước trong cùng file.
                String word = trim(row.get(COL_WORD));
                String reading = emptyToNull(trim(row.get(COL_READING)));
                if (word.isBlank()) {
                    throw new IllegalArgumentException("Thiếu cột '" + COL_WORD + "'");
                }
                if (wordRepository.existsByWordAndReading(word, reading)) {
                    result.setSkippedCount(result.getSkippedCount() + 1);
                    result.getErrors().add(new RowError(rowIndex,
                            "Bỏ qua (đã tồn tại): '" + word + "'"
                                    + (reading != null ? " [" + reading + "]" : "")));
                    rowIndex++;
                    continue;
                }

                wordService.createFull(toRequest(row));
                result.setSuccessCount(result.getSuccessCount() + 1);
            } catch (Exception e) {
                result.getErrors().add(new RowError(rowIndex, rootMessage(e)));
                result.setFailureCount(result.getFailureCount() + 1);
            }
            rowIndex++;
        }
        return result;
    }

    private WordCreateRequest toRequest(Map<String, String> row) {
        String word = trim(row.get(COL_WORD));
        if (word.isBlank())
            throw new IllegalArgumentException("Thiếu cột '" + COL_WORD + "'");

        String repCode = trim(row.get(COL_REPRESENTATION));
        if (repCode.isBlank())
            throw new IllegalArgumentException("Thiếu cột '" + COL_REPRESENTATION + "'");
        Representation rep = representationRepository.findByCode(repCode)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Không tìm thấy Representation có mã '" + repCode + "'"));

        String levelCode = trim(row.get(COL_LEVEL));
        if (levelCode.isBlank())
            throw new IllegalArgumentException("Thiếu cột '" + COL_LEVEL + "'");
        Level level = levelRepository.findByCode(levelCode)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Không tìm thấy Level có mã '" + levelCode + "'"));

        List<WordCreateRequest.MeaningInput> meanings = parseMeanings(trim(row.get(COL_MEANINGS)));
        if (meanings.isEmpty())
            throw new IllegalArgumentException("Cột '" + COL_MEANINGS + "' phải có ít nhất một nghĩa");

        List<WordCreateRequest.ExampleInput> examples = parseExamples(trim(row.get(COL_EXAMPLES)));

        return WordCreateRequest.builder()
                .word(word)
                .reading(emptyToNull(trim(row.get(COL_READING))))
                .wordType(emptyToNull(trim(row.get(COL_WORD_TYPE))))
                .frequency(parseInteger(row.get(COL_FREQUENCY)))
                .representationId(rep.getId())
                .levelId(level.getId())
                .meanings(meanings)
                .examples(examples)
                .build();
    }

    private List<WordCreateRequest.MeaningInput> parseMeanings(String raw) {
        List<WordCreateRequest.MeaningInput> out = new ArrayList<>();
        if (raw == null || raw.isBlank()) return out;

        for (String part : splitItems(raw)) {
            String code = DEFAULT_MEANING_LANG;
            String text = part;

            int idx = part.indexOf(MEANING_LANG_SEP);
            if (idx > 0) {
                String maybeCode = part.substring(0, idx).trim();
                // Chỉ coi là mã ngôn ngữ nếu ngắn & không có khoảng trắng — tránh
                // hiểu nhầm một nghĩa có chứa dấu ':' thành mã ngôn ngữ.
                if (maybeCode.length() <= 5 && !maybeCode.contains(" ")) {
                    code = maybeCode;
                    text = part.substring(idx + MEANING_LANG_SEP.length()).trim();
                }
            }
            if (text.isBlank()) continue;

            Long languageId = resolveLanguage(code);
            out.add(WordCreateRequest.MeaningInput.builder()
                    .languageId(languageId)
                    .name(text)
                    .build());
        }
        return out;
    }

    private List<WordCreateRequest.ExampleInput> parseExamples(String raw) {
        List<WordCreateRequest.ExampleInput> out = new ArrayList<>();
        if (raw == null || raw.isBlank()) return out;

        Long jaId = resolveLanguageAny(JA_CODES);
        Long viId = resolveLanguageAny(VI_CODES);

        for (String part : splitItems(raw)) {
            String root;
            String to;
            int idx = part.indexOf(EXAMPLE_ARROW);
            if (idx >= 0) {
                root = part.substring(0, idx).trim();
                to = part.substring(idx + EXAMPLE_ARROW.length()).trim();
            } else {
                root = part.trim();
                to = "";
            }
            if (root.isBlank()) continue;

            out.add(WordCreateRequest.ExampleInput.builder()
                    .rootLanguageId(jaId)
                    .toLanguageId(viId)
                    .rootExample(root)
                    .toExample(emptyToNull(to))
                    .build());
        }
        return out;
    }

    private Long resolveLanguage(String code) {
        return languageRepository.findByCode(code)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Không tìm thấy ngôn ngữ có mã '" + code + "'"))
                .getId();
    }

    private Long resolveLanguageAny(String... codes) {
        for (String c : codes) {
            var found = languageRepository.findByCode(c);
            if (found.isPresent()) return found.get().getId();
        }
        throw new IllegalArgumentException(
                "Không tìm thấy ngôn ngữ (cần một trong các mã: " + String.join(", ", codes) + ")");
    }

    // ═══════════════════════════ TEMPLATE ═══════════════════════════

    public byte[] buildTemplate() {
        List<List<String>> samples = List.of(
                List.of("食べる", "たべる", "v1", "1200", "KANJI", "N5",
                        "vi: ăn " + ITEM_SEP + " en: to eat",
                        "毎朝ご飯を食べる。 " + EXAMPLE_ARROW + " Mỗi sáng tôi ăn cơm."),
                List.of("学生", "がくせい", "n", "800", "KANJI", "N5",
                        "vi: học sinh, sinh viên " + ITEM_SEP + " en: student",
                        "私は学生です。 " + EXAMPLE_ARROW + " Tôi là học sinh.")
        );

        try (Workbook wb = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            writeSheet(wb, SHEET_WORDS, HEADERS, samples);
            writeGuideSheet(wb);

            wb.write(out);
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Không tạo được file mẫu", e);
        }
    }

    private void writeGuideSheet(Workbook wb) {
        Sheet sheet = wb.createSheet("Huong dan");
        String[] lines = {
                "HƯỚNG DẪN NHẬP TỪ VỰNG",
                "",
                "• Mỗi dòng ở sheet 'Words' là MỘT từ vựng. KHÔNG xoá dòng tiêu đề (dòng 1).",
                "• Có thể xoá các dòng ví dụ mẫu rồi điền dữ liệu của bạn.",
                "• Hỗ trợ file .xlsx và .csv (UTF-8).",
                "",
                "CỘT BẮT BUỘC: Word, Representation, Level, Meanings.",
                "",
                "Word*          : từ tiếng Nhật (kanji/kana). Vd: 食べる",
                "Reading        : cách đọc kana (furigana). Vd: たべる. Để trống nếu từ đã là kana.",
                "WordType       : mã loại từ — xem trang Word Types. Vd: v1, n, adj-i",
                "Frequency      : số nguyên, càng nhỏ càng phổ biến. Vd: 1200",
                "Representation*: MÃ dạng chữ — xem trang Representations. Vd: KANJI, HIRAGANA, KATAKANA",
                "Level*         : MÃ cấp độ JLPT — xem trang Levels. Vd: N5, N4, N3, N2, N1",
                "",
                "Meanings*      : một hoặc nhiều nghĩa, cách nhau bằng dấu '" + ITEM_SEP + "'.",
                "                 Mỗi nghĩa dạng  mãNgônNgữ" + MEANING_LANG_SEP + " nội dung",
                "                 Vd:  vi: ăn " + ITEM_SEP + " en: to eat",
                "                 Nếu bỏ 'mãNgônNgữ" + MEANING_LANG_SEP + "' sẽ mặc định là '" + DEFAULT_MEANING_LANG + "'.",
                "",
                "Examples       : (không bắt buộc) một hoặc nhiều câu, cách nhau bằng dấu '" + ITEM_SEP + "'.",
                "                 Mỗi câu dạng  câu tiếng Nhật " + EXAMPLE_ARROW + " bản dịch tiếng Việt",
                "                 Vd:  毎朝ご飯を食べる。 " + EXAMPLE_ARROW + " Mỗi sáng tôi ăn cơm.",
                "",
                "LƯU Ý:",
                "• Các MÃ (Representation, Level, mã ngôn ngữ) phải đã tồn tại trong hệ thống.",
                "• CHỐNG TRÙNG: nếu đã có từ cùng (Word + Reading) thì dòng đó bị BỎ QUA",
                "  (không tạo trùng, cũng không ghi đè). Nhập lại cùng file là an toàn.",
                "• Dòng nào lỗi sẽ được báo lại kèm số dòng; các dòng hợp lệ vẫn được nhập.",
        };
        for (int i = 0; i < lines.length; i++) {
            sheet.createRow(i).createCell(0).setCellValue(lines[i]);
        }
        sheet.setColumnWidth(0, 120 * 256);
    }

    // ═══════════════════════════ POI / CSV helpers ═══════════════════════════

    private byte[] buildWordsWorkbook(List<String> headers, List<List<String>> rows) {
        try (Workbook wb = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            writeSheet(wb, SHEET_WORDS, headers, rows);
            wb.write(out);
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Không tạo được file Excel", e);
        }
    }

    private void writeSheet(Workbook wb, String sheetName, List<String> headers, List<List<String>> rows) {
        Sheet sheet = wb.createSheet(sheetName);

        CellStyle headerStyle = wb.createCellStyle();
        Font bold = wb.createFont();
        bold.setBold(true);
        headerStyle.setFont(bold);

        Row header = sheet.createRow(0);
        for (int i = 0; i < headers.size(); i++) {
            Cell c = header.createCell(i);
            c.setCellValue(headers.get(i));
            c.setCellStyle(headerStyle);
        }

        for (int r = 0; r < rows.size(); r++) {
            Row row = sheet.createRow(r + 1);
            List<String> vals = rows.get(r);
            for (int i = 0; i < headers.size(); i++) {
                row.createCell(i).setCellValue(i < vals.size() ? nz(vals.get(i)) : "");
            }
        }

        for (int i = 0; i < headers.size(); i++) {
            sheet.autoSizeColumn(i);
        }
    }

    private byte[] buildCsv(List<String> headers, List<List<String>> rows) {
        StringBuilder sb = new StringBuilder();
        sb.append('﻿'); // BOM để Excel mở UTF-8 đúng tiếng Nhật/Việt
        sb.append(csvLine(headers)).append("\r\n");
        for (List<String> r : rows) {
            sb.append(csvLine(r)).append("\r\n");
        }
        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    private String csvLine(List<String> cells) {
        return cells.stream().map(this::csvCell).collect(Collectors.joining(","));
    }

    private String csvCell(String v) {
        String s = nz(v);
        if (s.contains(",") || s.contains("\"") || s.contains("\n") || s.contains("\r")) {
            return "\"" + s.replace("\"", "\"\"") + "\"";
        }
        return s;
    }

    // ── Parse file (xlsx qua POI, csv qua opencsv UTF-8 + bỏ BOM) ──
    private List<Map<String, String>> parse(MultipartFile file) throws Exception {
        String name = file.getOriginalFilename() == null
                ? "" : file.getOriginalFilename().toLowerCase();
        return name.endsWith(".csv") ? parseCsv(file) : parseXlsx(file);
    }

    private List<Map<String, String>> parseXlsx(MultipartFile file) throws Exception {
        try (InputStream in = file.getInputStream();
             Workbook wb = new XSSFWorkbook(in)) {

            Sheet sheet = wb.getSheetAt(0);
            if (sheet == null) return List.of();

            Row headerRow = sheet.getRow(0);
            if (headerRow == null) return List.of();

            List<String> headers = new ArrayList<>();
            for (Cell c : headerRow) headers.add(cellString(c));

            List<Map<String, String>> rows = new ArrayList<>();
            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;
                Map<String, String> map = new HashMap<>();
                for (int j = 0; j < headers.size(); j++) {
                    map.put(headers.get(j), cellString(row.getCell(j)));
                }
                rows.add(map);
            }
            return rows;
        }
    }

    private List<Map<String, String>> parseCsv(MultipartFile file) throws Exception {
        try (InputStream in = file.getInputStream();
             CSVReader reader = new CSVReader(new InputStreamReader(in, StandardCharsets.UTF_8))) {

            List<String[]> all = reader.readAll();
            if (all.size() < 2) return List.of();

            String[] headers = all.get(0);
            if (headers.length > 0) headers[0] = stripBom(headers[0]);

            List<Map<String, String>> rows = new ArrayList<>();
            for (int i = 1; i < all.size(); i++) {
                String[] r = all.get(i);
                Map<String, String> map = new HashMap<>();
                for (int j = 0; j < headers.length; j++) {
                    map.put(trim(headers[j]), j < r.length ? r[j] : "");
                }
                rows.add(map);
            }
            return rows;
        }
    }

    private String cellString(Cell c) {
        if (c == null) return "";
        return switch (c.getCellType()) {
            case STRING -> c.getStringCellValue().trim();
            case NUMERIC -> {
                double d = c.getNumericCellValue();
                if (d == Math.floor(d) && !Double.isInfinite(d)) yield String.valueOf((long) d);
                yield String.valueOf(d);
            }
            case BOOLEAN -> String.valueOf(c.getBooleanCellValue());
            case FORMULA -> {
                try {
                    yield c.getStringCellValue().trim();
                } catch (Exception e) {
                    yield "";
                }
            }
            default -> "";
        };
    }

    // ═══════════════════════════ small utils ═══════════════════════════

    private List<String> splitItems(String raw) {
        List<String> out = new ArrayList<>();
        for (String s : ITEM_SPLIT.split(raw)) {
            String t = s.trim();
            if (!t.isEmpty()) out.add(t);
        }
        return out;
    }

    private Integer parseInteger(String raw) {
        if (raw == null || raw.isBlank()) return null;
        String v = raw.trim();
        try {
            if (v.contains(".")) return (int) Math.round(Double.parseDouble(v));
            return Integer.parseInt(v);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Frequency phải là số nguyên: '" + raw + "'");
        }
    }

    private boolean isBlankRow(Map<String, String> row) {
        return row.values().stream().allMatch(v -> v == null || v.isBlank());
    }

    private String stripBom(String s) {
        return (s != null && s.startsWith("﻿")) ? s.substring(1) : s;
    }

    private String trim(String s) {
        return s == null ? "" : s.trim();
    }

    private String nz(String s) {
        return s == null ? "" : s;
    }

    private String emptyToNull(String s) {
        return (s == null || s.isBlank()) ? null : s;
    }

    private String rootMessage(Throwable e) {
        Throwable cur = e;
        while (cur.getCause() != null && cur.getCause() != cur) cur = cur.getCause();
        String msg = cur.getMessage();
        return (msg == null || msg.isBlank()) ? cur.getClass().getSimpleName() : msg;
    }
}