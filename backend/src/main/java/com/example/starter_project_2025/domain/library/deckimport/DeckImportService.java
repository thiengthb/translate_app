package com.example.starter_project_2025.domain.library.deckimport;

import com.example.starter_project_2025.domain.library.deck.Deck;
import com.example.starter_project_2025.domain.library.deck.DeckRepository;
import com.example.starter_project_2025.domain.library.deck_item.DeckItem;
import com.example.starter_project_2025.domain.library.deck_item.DeckItemRepository;
import com.example.starter_project_2025.domain.library.deckimport.DeckImportDtos.ColumnPreview;
import com.example.starter_project_2025.domain.library.deckimport.DeckImportDtos.ConfirmRequest;
import com.example.starter_project_2025.domain.library.deckimport.DeckImportDtos.DeckTarget;
import com.example.starter_project_2025.domain.library.deckimport.DeckImportDtos.DelimiterOption;
import com.example.starter_project_2025.domain.library.deckimport.DeckImportDtos.DuplicateStrategy;
import com.example.starter_project_2025.domain.library.deckimport.DeckImportDtos.ImportResultResponse;
import com.example.starter_project_2025.domain.library.deckimport.DeckImportDtos.ImportTargetField;
import com.example.starter_project_2025.domain.library.deckimport.DeckImportDtos.PreviewResponse;
import com.example.starter_project_2025.domain.library.deckimport.DeckImportDtos.RowError;
import com.example.starter_project_2025.domain.library.deckimport.DeckImportDtos.RowPreview;
import com.example.starter_project_2025.domain.library.flashcard.ContentType;
import com.example.starter_project_2025.domain.library.flashcard.Flashcard;
import com.example.starter_project_2025.domain.library.flashcard.FlashcardRepository;
import com.example.starter_project_2025.domain.library.flashcard.FlashcardSide;
import com.example.starter_project_2025.domain.library.flashcard.FlashcardSideContent;
import com.example.starter_project_2025.domain.library.flashcard.SideType;
import com.example.starter_project_2025.domain.library.folder.Folder;
import com.example.starter_project_2025.domain.library.folder.FolderRepository;
import com.example.starter_project_2025.domain.library.tag.Tag;
import com.example.starter_project_2025.domain.library.tag.TagRepository;
import com.example.starter_project_2025.exception.BadRequestException;
import com.example.starter_project_2025.exception.ResourceNotFoundException;
import com.example.starter_project_2025.system.rbac.user.User;
import com.example.starter_project_2025.system.rbac.user.UserRepository;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.opencsv.CSVParser;
import com.opencsv.CSVParserBuilder;
import com.opencsv.CSVReader;
import com.opencsv.CSVReaderBuilder;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.FormulaEvaluator;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.charset.Charset;
import java.io.StringReader;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class DeckImportService {

    private static final int MAX_ROWS = 5000;
    private static final int DEFAULT_PREVIEW_ROWS = 10;
    private static final int MAX_PREVIEW_ROWS = 100;
    private static final int MAX_SAMPLE_VALUES = 3;
    private static final Set<String> SUPPORTED_EXTENSIONS = Set.of(".csv", ".tsv", ".txt", ".xlsx", ".xls");
    private static final String DEFAULT_TAG_COLOR = "#0ea5e9";

    DeckRepository deckRepository;
    DeckItemRepository deckItemRepository;
    FlashcardRepository flashcardRepository;
    TagRepository tagRepository;
    FolderRepository folderRepository;
    UserRepository userRepository;
    ImportBatchRepository importBatchRepository;

    Cache<String, ParsedUpload> previewCache = Caffeine.newBuilder()
            .expireAfterWrite(Duration.ofMinutes(30))
            .maximumSize(200)
            .build();

    @Transactional(readOnly = true)
    public PreviewResponse preview(
            MultipartFile file,
            DelimiterOption delimiterOption,
            Boolean headerOverride,
            Integer previewPage,
            Integer previewRows,
            Long userId
    ) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("File is required");
        }
        String fileName = Objects.requireNonNullElse(file.getOriginalFilename(), "import.csv");
        if (!isSupported(fileName)) {
            throw new BadRequestException("Only .csv, .tsv, .txt, .xlsx and .xls files are supported");
        }

        try {
            byte[] bytes = file.getBytes();
            if (isSpreadsheet(fileName)) {
                List<String[]> rawRows = readSpreadsheetRows(new ByteArrayInputStream(bytes));
                return previewTabularRows(rawRows, fileName, "Excel", headerOverride, previewPage, previewRows, userId);
            }

            String content = decodeText(bytes);

            Optional<ParsedUpload> structuredText = parseStructuredTextUpload(content, fileName, userId);
            if (structuredText.isPresent()) {
                String token = UUID.randomUUID().toString();
                ParsedUpload upload = structuredText.get();
                previewCache.put(token, upload);
                return buildPreviewResponse(token, upload, normalizePreviewPage(previewPage), normalizePreviewRows(previewRows));
            }

            Optional<ParsedUpload> linePairs = parseLinePairTextUpload(content, fileName, userId);
            if (linePairs.isPresent()) {
                String token = UUID.randomUUID().toString();
                ParsedUpload upload = linePairs.get();
                previewCache.put(token, upload);
                return buildPreviewResponse(token, upload, normalizePreviewPage(previewPage), normalizePreviewRows(previewRows));
            }

            char delimiter = delimiterOption == null || delimiterOption == DelimiterOption.AUTO
                    ? detectDelimiter(content)
                    : delimiterFor(delimiterOption, fileName);

            List<String[]> rawRows = readDelimitedRows(content, delimiter);
            return previewTabularRows(rawRows, fileName, printableDelimiter(delimiter), headerOverride, previewPage, previewRows, userId);
        } catch (BadRequestException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new BadRequestException("Could not parse import file: " + ex.getMessage());
        }
    }

    private PreviewResponse previewTabularRows(
            List<String[]> rawRows,
            String fileName,
            String delimiterLabel,
            Boolean headerOverride,
            Integer previewPage,
            Integer previewRows,
            Long userId
    ) {
        rawRows = rawRows.stream()
                .filter(row -> !isBlankRow(row))
                .limit(MAX_ROWS + 1L)
                .collect(Collectors.toCollection(ArrayList::new));
        if (rawRows.size() > MAX_ROWS) {
            throw new BadRequestException("Import is limited to " + MAX_ROWS + " rows");
        }
        if (rawRows.isEmpty()) {
            throw new BadRequestException("File has no rows to import");
        }

        boolean hasHeader = headerOverride != null ? headerOverride : looksLikeHeader(rawRows);
        String[] header = hasHeader ? rawRows.get(0) : syntheticHeader(maxColumns(rawRows));
        int startIndex = hasHeader ? 1 : 0;
        int columnCount = Math.max(header.length, maxColumns(rawRows));
        List<String> labels = buildLabels(header, columnCount);
        Map<String, ImportTargetField> mapping = suggestMapping(labels, rawRows, startIndex);

        List<ParsedRow> parsedRows = new ArrayList<>();
        for (int i = startIndex; i < rawRows.size(); i++) {
            parsedRows.add(new ParsedRow(i + 1, valuesFor(rawRows.get(i), columnCount)));
        }
        if (parsedRows.isEmpty()) {
            throw new BadRequestException("File has a header but no importable rows");
        }

        String token = UUID.randomUUID().toString();
        ParsedUpload upload = new ParsedUpload(userId, fileName, delimiterLabel, hasHeader, labels, parsedRows, mapping);
        previewCache.put(token, upload);
        return buildPreviewResponse(token, upload, normalizePreviewPage(previewPage), normalizePreviewRows(previewRows));
    }

    public ImportResultResponse confirm(ConfirmRequest request, Long userId) {
        if (request == null || isBlank(request.getToken())) {
            throw new BadRequestException("Preview token is required");
        }

        ParsedUpload upload = previewCache.getIfPresent(request.getToken());
        if (upload == null || !Objects.equals(upload.userId(), userId)) {
            throw new BadRequestException("Preview expired. Please upload the file again");
        }

        Map<String, ImportTargetField> mapping = effectiveMapping(request.getMapping(), upload.suggestedMapping());
        validateMapping(mapping);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        boolean existingDeckTarget = request.getDeckId() != null;
        Deck deck = resolveDeck(request, user);

        ImportBatch batch = ImportBatch.builder()
                .user(user)
                .deck(deck)
                .fileName(upload.fileName())
                .status(ImportBatchStatus.RUNNING)
                .totalRows(upload.rows().size())
                .createdRows(0)
                .updatedRows(0)
                .skippedRows(0)
                .failedRows(0)
                .duplicateRows(0)
                .build();
        batch = importBatchRepository.save(batch);
        importBatchRepository.flush();

        DuplicateStrategy duplicateStrategy = request.getDuplicateStrategy() != null
                ? request.getDuplicateStrategy()
                : DuplicateStrategy.SKIP;

        ImportCounters counters = new ImportCounters();
        Map<String, Flashcard> existingByFront = existingDeckTarget ? existingFrontMap(deck.getId()) : new HashMap<>();
        List<DeckItem> currentItems = existingDeckTarget
                ? deckItemRepository.findByDeckIdOrderByOrderIndexAsc(deck.getId())
                : List.of();
        int nextOrderIndex = currentItems.stream().mapToInt(DeckItem::getOrderIndex).max().orElse(-1) + 1;
        attachTags(deck, collectTags(upload.rows(), mapping), user);

        List<RowError> rowErrors = new ArrayList<>();
        for (ParsedRow row : upload.rows()) {
            try {
                CardPayload payload = buildPayload(row, mapping);
                if (isBlank(payload.front())) {
                    throw new BadRequestException("Front is required");
                }
                if (isBlank(payload.back())) {
                    throw new BadRequestException("Back is required");
                }

                String normalizedFront = normalizeFront(payload.front());
                Flashcard duplicate = existingByFront.get(normalizedFront);
                boolean hasDuplicate = duplicate != null;
                if (hasDuplicate) counters.duplicateRows++;

                if (hasDuplicate && duplicateStrategy == DuplicateStrategy.SKIP) {
                    counters.skippedRows++;
                    continue;
                }

                if (hasDuplicate && duplicateStrategy == DuplicateStrategy.UPDATE) {
                    applyPayload(duplicate, payload);
                    flashcardRepository.save(duplicate);
                    counters.updatedRows++;
                    continue;
                }

                // NOTE: must use the instance RETURNED by save(). BaseEntity has a
                // @Version (Long) defaulted to 0L by the builder, so Spring Data sees
                // a builder-made entity as "not new" and routes save() to merge() — the
                // managed copy is the return value, while the original stays transient.
                // Referencing the transient original in DeckItem.flashcard triggers
                // HHH000437 ("unsaved transient entity") and a failed flush.
                Flashcard created = flashcardRepository.save(createFlashcard(payload));
                DeckItem item = DeckItem.builder()
                        .deck(deck)
                        .flashcard(created)
                        .orderIndex(nextOrderIndex++)
                        .build();
                deckItemRepository.save(item);
                existingByFront.put(normalizedFront, created);
                counters.createdRows++;
            } catch (Exception ex) {
                counters.failedRows++;
                RowError rowError = RowError.builder()
                        .rowNumber(row.rowNumber())
                        .message(ex.getMessage() != null ? ex.getMessage() : ex.getClass().getSimpleName())
                        .rawData(asObjectMap(row.values()))
                        .build();
                rowErrors.add(rowError);
            }
        }

        int finalCount = currentItems.size() + counters.createdRows;
        deck.setTotalCards(finalCount);
        deckRepository.save(deck);

        batch.setStatus(counters.failedRows == upload.rows().size() ? ImportBatchStatus.FAILED : ImportBatchStatus.COMPLETED);
        batch.setCreatedRows(counters.createdRows);
        batch.setUpdatedRows(counters.updatedRows);
        batch.setSkippedRows(counters.skippedRows);
        batch.setFailedRows(counters.failedRows);
        batch.setDuplicateRows(counters.duplicateRows);
        batch.setCompletedAt(LocalDateTime.now());
        batch = importBatchRepository.save(batch);

        previewCache.invalidate(request.getToken());
        return resultResponse(batch, rowErrors);
    }

    @Transactional(readOnly = true)
    public ImportResultResponse getBatch(Long batchId, Long userId) {
        ImportBatch batch = importBatchRepository.findByIdAndUserId(batchId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Import batch not found"));
        return resultResponse(batch, List.of());
    }

    private PreviewResponse buildPreviewResponse(String token, ParsedUpload upload, int previewPage, int previewRows) {
        List<ColumnPreview> columns = new ArrayList<>();
        for (int i = 0; i < upload.labels().size(); i++) {
            String key = columnKey(i);
            columns.add(ColumnPreview.builder()
                    .key(key)
                    .label(upload.labels().get(i))
                    .index(i)
                    .suggestedField(upload.suggestedMapping().getOrDefault(key, ImportTargetField.IGNORE))
                    .samples(sampleValues(upload.rows(), key))
                    .build());
        }

        int totalPages = Math.max(1, (int) Math.ceil(upload.rows().size() / (double) previewRows));
        int safePage = Math.min(previewPage, totalPages);
        long offset = (long) (safePage - 1) * previewRows;

        List<RowPreview> rows = upload.rows().stream()
                .skip(offset)
                .limit(previewRows)
                .map(row -> RowPreview.builder()
                        .rowNumber(row.rowNumber())
                        .values(row.values())
                        .warnings(previewWarnings(row, upload.suggestedMapping()))
                        .build())
                .toList();

        List<String> warnings = new ArrayList<>();
        if (!upload.suggestedMapping().containsValue(ImportTargetField.FRONT)) {
            warnings.add("No front column was detected. Please map one column to Front.");
        }
        if (!upload.suggestedMapping().containsValue(ImportTargetField.BACK)) {
            warnings.add("No back column was detected. Please map one column to Back.");
        }

        return PreviewResponse.builder()
                .token(token)
                .fileName(upload.fileName())
                .delimiter(upload.delimiter())
                .headerDetected(upload.headerDetected())
                .totalRows(upload.rows().size())
                .previewPage(safePage)
                .previewRows(previewRows)
                .totalPages(totalPages)
                .columnCount(upload.labels().size())
                .columns(columns)
                .rows(rows)
                .suggestedMapping(upload.suggestedMapping())
                .warnings(warnings)
                .build();
    }

    private int normalizePreviewPage(Integer previewPage) {
        return previewPage == null || previewPage < 1 ? 1 : previewPage;
    }

    private int normalizePreviewRows(Integer previewRows) {
        if (previewRows == null) return DEFAULT_PREVIEW_ROWS;
        if (previewRows <= 10) return 10;
        if (previewRows <= 20) return 20;
        if (previewRows <= 50) return 50;
        return MAX_PREVIEW_ROWS;
    }

    private Deck resolveDeck(ConfirmRequest request, User user) {
        if (request.getDeckId() != null) {
            Deck deck = deckRepository.findById(request.getDeckId())
                    .orElseThrow(() -> new ResourceNotFoundException("Deck not found"));
            if (deck.getUser() == null || deck.getUser().getId() == null || !deck.getUser().getId().equals(user.getId())) {
                throw new AccessDeniedException("You do not own this deck");
            }
            return deck;
        }

        DeckTarget target = request.getDeck();
        if (target == null || isBlank(target.getTitle())) {
            throw new BadRequestException("Deck title is required");
        }

        Deck deck = Deck.builder()
                .user(user)
                .folder(resolveFolder(target.getFolderId(), user.getId()))
                .title(uniqueDeckTitle(target.getTitle().trim(), user.getId()))
                .description(trimToNull(target.getDescription()))
                .visibility(isBlank(target.getVisibility()) ? "PRIVATE" : target.getVisibility().trim().toUpperCase(Locale.ROOT))
                .deckIcon(trimToNull(target.getDeckIcon()))
                .deckColor(trimToNull(target.getDeckColor()))
                .sourceLanguage(trimToNull(target.getSourceLanguage()))
                .targetLanguage(trimToNull(target.getTargetLanguage()))
                .totalCards(0)
                .build();
        return deckRepository.save(deck);
    }

    private Folder resolveFolder(Long folderId, Long userId) {
        if (folderId == null) return null;
        Folder folder = folderRepository.findById(folderId)
                .orElseThrow(() -> new ResourceNotFoundException("Folder not found"));
        if (folder.getUser() == null || folder.getUser().getId() == null || !folder.getUser().getId().equals(userId)) {
            throw new AccessDeniedException("You do not own this folder");
        }
        return folder;
    }

    private String uniqueDeckTitle(String baseTitle, Long userId) {
        String candidate = baseTitle;
        int suffix = 2;
        while (deckRepository.existsByTitleAndUserId(candidate, userId)) {
            candidate = baseTitle + " (" + suffix + ")";
            suffix++;
        }
        return candidate;
    }

    private Map<String, Flashcard> existingFrontMap(Long deckId) {
        Map<String, Flashcard> result = new HashMap<>();
        for (DeckItem item : deckItemRepository.findByDeckIdOrderByOrderIndexAsc(deckId)) {
            Flashcard card = item.getFlashcard();
            if (card == null || isBlank(card.getFront())) continue;
            result.putIfAbsent(normalizeFront(card.getFront()), card);
        }
        return result;
    }

    private CardPayload buildPayload(ParsedRow row, Map<String, ImportTargetField> mapping) {
        EnumMap<ImportTargetField, List<String>> values = new EnumMap<>(ImportTargetField.class);
        for (Map.Entry<String, ImportTargetField> entry : mapping.entrySet()) {
            ImportTargetField target = entry.getValue();
            if (target == null || target == ImportTargetField.IGNORE) continue;
            String value = trimToNull(row.values().get(entry.getKey()));
            if (value == null) continue;
            values.computeIfAbsent(target, ignored -> new ArrayList<>()).add(value);
        }
        CardPayload payload = new CardPayload(
                joined(values, ImportTargetField.FRONT),
                joined(values, ImportTargetField.BACK),
                joined(values, ImportTargetField.READING),
                joined(values, ImportTargetField.ROMAJI),
                joined(values, ImportTargetField.ONYOMI),
                joined(values, ImportTargetField.KUNYOMI),
                joined(values, ImportTargetField.EXAMPLE),
                joined(values, ImportTargetField.EXAMPLE_TRANSLATION),
                joined(values, ImportTargetField.NOTE),
                splitTags(first(values, ImportTargetField.TAGS))
        );
        if (isBlank(payload.back())) {
            String fallbackBack = firstNonBlank(payload.exampleTranslation(), payload.example(), payload.note(), payload.front());
            payload = new CardPayload(
                    payload.front(),
                    fallbackBack,
                    payload.reading(),
                    payload.romaji(),
                    payload.onyomi(),
                    payload.kunyomi(),
                    payload.example(),
                    payload.exampleTranslation(),
                    payload.note(),
                    payload.tags()
            );
        }
        return payload;
    }

    private Optional<ParsedUpload> parseStructuredTextUpload(String content, String fileName, Long userId) {
        String lowerName = fileName != null ? fileName.toLowerCase(Locale.ROOT) : "";
        boolean textFile = lowerName.endsWith(".txt");
        if (!textFile && !looksLikeStructuredText(content)) return Optional.empty();

        List<TextCard> cards = new ArrayList<>();
        TextCard current = null;
        for (String rawLine : content.split("\\R")) {
            String line = trimToNull(rawLine);
            if (line == null) continue;

            if (isNumberedEntry(line)) {
                if (current != null) cards.add(current);
                String front = cleanNumberedFront(line);
                current = new TextCard(front, new ArrayList<>(), new ArrayList<>(), new ArrayList<>());
                String[] inlinePair = splitPlainTextPair(front);
                if (inlinePair != null) {
                    current = new TextCard(inlinePair[0], new ArrayList<>(), new ArrayList<>(), new ArrayList<>());
                    current.translations().add(inlinePair[1]);
                }
                continue;
            }

            if (current == null) continue;

            String translation = stripLabeledLine(line, "dịch", "dich", "translation", "meaning");
            if (translation != null) {
                current.translations().add(translation);
                continue;
            }

            String example = stripLabeledLine(line, "例文", "example", "ví dụ", "vi du");
            if (example != null) {
                current.examples().add(example);
                continue;
            }

            current.notes().add(line);
        }
        if (current != null) cards.add(current);

        List<TextCard> importable = cards.stream()
                .filter(card -> !isBlank(card.front()))
                .toList();
        if (importable.size() < 2) return Optional.empty();

        List<String> labels = List.of("Front", "Back", "Note");
        Map<String, ImportTargetField> mapping = new LinkedHashMap<>();
        mapping.put(columnKey(0), ImportTargetField.FRONT);
        mapping.put(columnKey(1), ImportTargetField.BACK);
        mapping.put(columnKey(2), ImportTargetField.NOTE);

        List<ParsedRow> rows = new ArrayList<>();
        for (int i = 0; i < importable.size(); i++) {
            TextCard card = importable.get(i);
            String back = joinNonBlank(card.translations());
            String examples = joinNonBlank(card.examples());
            String notes = joinNonBlank(card.notes());
            String note = joinNonBlank(List.of(examples, notes));
            if (isBlank(back)) back = firstNonBlank(note, card.front());

            Map<String, String> values = new LinkedHashMap<>();
            values.put(columnKey(0), card.front());
            values.put(columnKey(1), back);
            values.put(columnKey(2), note);
            rows.add(new ParsedRow(i + 1, values));
        }

        return Optional.of(new ParsedUpload(userId, fileName, "Structured text", false, labels, rows, mapping));
    }

    private Optional<ParsedUpload> parseLinePairTextUpload(String content, String fileName, Long userId) {
        String lowerName = fileName != null ? fileName.toLowerCase(Locale.ROOT) : "";
        if (!lowerName.endsWith(".txt")) return Optional.empty();

        List<ParsedRow> rows = new ArrayList<>();
        int lineNumber = 0;
        for (String rawLine : content.split("\\R")) {
            lineNumber++;
            String line = trimToNull(rawLine);
            if (line == null || line.startsWith("#")) continue;

            String[] pair = splitPlainTextPair(line);
            if (pair == null) continue;

            Map<String, String> values = new LinkedHashMap<>();
            values.put(columnKey(0), pair[0]);
            values.put(columnKey(1), pair[1]);
            rows.add(new ParsedRow(lineNumber, values));
        }

        if (rows.size() < 2) return Optional.empty();

        List<String> labels = List.of("Front", "Back");
        Map<String, ImportTargetField> mapping = new LinkedHashMap<>();
        mapping.put(columnKey(0), ImportTargetField.FRONT);
        mapping.put(columnKey(1), ImportTargetField.BACK);
        return Optional.of(new ParsedUpload(userId, fileName, "Text pairs", false, labels, rows, mapping));
    }

    private String[] splitPlainTextPair(String line) {
        line = cleanPairCandidate(line);
        String[] separators = new String[]{"\t", " :: ", "::", " = ", " - ", " – ", " — ", ":", "："};
        for (String separator : separators) {
            int index = line.indexOf(separator);
            if (index <= 0 || index >= line.length() - separator.length()) continue;

            String left = trimToNull(line.substring(0, index));
            String right = trimToNull(line.substring(index + separator.length()));
            if (left == null || right == null || isGenericLabel(left)) continue;
            return new String[]{left, right};
        }
        return null;
    }

    private String cleanPairCandidate(String line) {
        String cleaned = isNumberedEntry(line) ? cleanNumberedFront(line) : line;
        return cleaned.replaceFirst("^\\s*[-*•]\\s+", "").trim();
    }

    private boolean isGenericLabel(String value) {
        String normalized = normalizeLabel(value);
        return matches(normalized,
                "front", "back", "term", "word", "answer", "meaning", "translation",
                "dich", "nghia", "example", "vi du", "note", "ghi chu",
                "on", "kun", "onyomi", "kunyomi", "reading", "例", "例文");
    }

    private boolean looksLikeStructuredText(String content) {
        if (content == null) return false;
        long numbered = Arrays.stream(content.split("\\R"))
                .map(String::trim)
                .filter(this::isNumberedEntry)
                .limit(3)
                .count();
        return numbered >= 2;
    }

    private boolean isNumberedEntry(String line) {
        return line != null && line.matches("^\\s*\\d+\\s*[.)．、-]\\s*.+$");
    }

    private String cleanNumberedFront(String line) {
        if (line == null) return "";
        return line.replaceFirst("^\\s*\\d+\\s*[.)．、-]\\s*", "").trim();
    }

    private String stripLabeledLine(String line, String... labels) {
        if (line == null) return null;
        String normalized = normalizeLabel(line);
        for (String label : labels) {
            String normalizedLabel = normalizeLabel(label);
            if (normalized.startsWith(normalizedLabel + ":")
                    || normalized.startsWith(normalizedLabel + " ")
                    || normalized.startsWith("- " + normalizedLabel + ":")
                    || normalized.startsWith("- " + normalizedLabel + " ")) {
                return line.replaceFirst("^\\s*-?\\s*[^:：-]+\\s*[:：-]?\\s*", "").trim();
            }
        }
        return null;
    }

    private String joinNonBlank(List<String> values) {
        if (values == null) return "";
        return values.stream()
                .map(this::trimToNull)
                .filter(Objects::nonNull)
                .collect(Collectors.joining("\n"));
    }

    private String firstNonBlank(String... values) {
        if (values == null) return "";
        for (String value : values) {
            if (!isBlank(value)) return value.trim();
        }
        return "";
    }

    private Set<String> collectTags(List<ParsedRow> rows, Map<String, ImportTargetField> mapping) {
        Set<String> tags = new HashSet<>();
        if (rows == null || rows.isEmpty()) return tags;
        for (ParsedRow row : rows) {
            CardPayload payload = buildPayload(row, mapping);
            tags.addAll(payload.tags());
        }
        return tags;
    }

    private void attachTags(Deck deck, Set<String> tagNames, User user) {
        if (tagNames == null || tagNames.isEmpty()) return;
        if (deck.getTags() == null) deck.setTags(new HashSet<>());

        for (String tagName : tagNames) {
            Tag tag = tagRepository.findByNameAndUserId(tagName, user.getId())
                    .orElseGet(() -> tagRepository.save(Tag.builder()
                            .user(user)
                            .name(tagName)
                            .color(DEFAULT_TAG_COLOR)
                            .build()));
            deck.getTags().add(tag);
        }
    }

    private Flashcard createFlashcard(CardPayload payload) {
        Flashcard card = Flashcard.builder()
                .cardType("BASIC")
                .itemType("WORD")
                .itemId(0L)
                .front(payload.front())
                .back(payload.back())
                .hint(payload.note())
                .explanation(payload.exampleTranslation())
                .sides(new ArrayList<>())
                .build();
        card.getSides().addAll(buildSides(card, payload));
        return card;
    }

    private void applyPayload(Flashcard card, CardPayload payload) {
        card.setFront(payload.front());
        card.setBack(payload.back());
        card.setHint(payload.note());
        card.setExplanation(payload.exampleTranslation());
        if (card.getSides() == null) card.setSides(new ArrayList<>());
        card.getSides().clear();
        card.getSides().addAll(buildSides(card, payload));
    }

    private List<FlashcardSide> buildSides(Flashcard card, CardPayload payload) {
        FlashcardSide front = FlashcardSide.builder()
                .flashcard(card)
                .side(SideType.FRONT)
                .contents(new ArrayList<>())
                .build();
        addContent(front, "Front", payload.front(), 0);
        addContent(front, "Reading", payload.reading(), 1);
        addContent(front, "Romaji", payload.romaji(), 2);

        FlashcardSide back = FlashcardSide.builder()
                .flashcard(card)
                .side(SideType.BACK)
                .contents(new ArrayList<>())
                .build();
        addContent(back, "Back", payload.back(), 0);
        addContent(back, "Onyomi", payload.onyomi(), 1);
        addContent(back, "Kunyomi", payload.kunyomi(), 2);
        addContent(back, "Example", payload.example(), 3);
        addContent(back, "Example translation", payload.exampleTranslation(), 4);
        addContent(back, "Note", payload.note(), 5);

        return List.of(front, back);
    }

    private void addContent(FlashcardSide side, String label, String value, int orderIndex) {
        if (isBlank(value)) return;
        side.getContents().add(FlashcardSideContent.builder()
                .side(side)
                .label(label)
                .contentType(ContentType.TEXT)
                .contentValue(value.trim())
                .orderIndex(orderIndex)
                .build());
    }

    private List<String> splitTags(String raw) {
        if (isBlank(raw)) return List.of();
        return Arrays.stream(raw.split("[,;|]"))
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .distinct()
                .toList();
    }

    private void validateMapping(Map<String, ImportTargetField> mapping) {
        if (!mapping.containsValue(ImportTargetField.FRONT)) {
            throw new BadRequestException("Please map one column to Front");
        }
        if (!mapping.containsValue(ImportTargetField.BACK)) {
            throw new BadRequestException("Please map one column to Back");
        }
    }

    private Map<String, ImportTargetField> effectiveMapping(
            Map<String, ImportTargetField> requestMapping,
            Map<String, ImportTargetField> suggestedMapping
    ) {
        Map<String, ImportTargetField> result = new LinkedHashMap<>();
        if (suggestedMapping != null) result.putAll(suggestedMapping);
        if (requestMapping != null) {
            for (Map.Entry<String, ImportTargetField> entry : requestMapping.entrySet()) {
                result.put(entry.getKey(), entry.getValue() != null ? entry.getValue() : ImportTargetField.IGNORE);
            }
        }
        return result;
    }

    private Map<String, ImportTargetField> suggestMapping(List<String> labels, List<String[]> rows, int startIndex) {
        Map<String, ImportTargetField> mapping = new LinkedHashMap<>();
        Set<ImportTargetField> alreadyUsed = new HashSet<>();
        for (int i = 0; i < labels.size(); i++) {
            ImportTargetField suggested = suggestField(labels.get(i));
            if (suggested == ImportTargetField.IGNORE || isSyntheticColumnLabel(labels.get(i), i)) {
                suggested = suggestFieldFromSamples(sampleColumnValues(rows, startIndex, i, 8));
            }
            if (suggested != ImportTargetField.IGNORE && suggested != ImportTargetField.TAGS && alreadyUsed.contains(suggested)) {
                suggested = ImportTargetField.IGNORE;
            }
            mapping.put(columnKey(i), suggested);
            if (suggested != ImportTargetField.IGNORE && suggested != ImportTargetField.TAGS) {
                alreadyUsed.add(suggested);
            }
        }

        if (!mapping.containsValue(ImportTargetField.FRONT) && labels.size() >= 1) {
            mapping.put(columnKey(0), ImportTargetField.FRONT);
        }
        if (!mapping.containsValue(ImportTargetField.BACK) && labels.size() >= 2) {
            mapping.put(columnKey(1), ImportTargetField.BACK);
        }
        return mapping;
    }

    private boolean isSyntheticColumnLabel(String label, int index) {
        return normalizeLabel(label).equals(normalizeLabel("Column " + (index + 1)));
    }

    private ImportTargetField suggestField(String label) {
        String normalized = normalizeLabel(label);
        if (matches(normalized, "front", "term", "word", "vocab", "vocabulary", "expression", "japanese", "kanji", "question", "cau hoi")) {
            return ImportTargetField.FRONT;
        }
        if (matches(normalized, "back", "meaning", "definition", "answer", "vietnamese", "translation", "nghia", "dich", "dich nghia", "tieng viet")) {
            return ImportTargetField.BACK;
        }
        if (matches(normalized, "reading", "kana", "furigana", "hiragana", "yomikata", "pronunciation", "phien am")) {
            return ImportTargetField.READING;
        }
        if (matches(normalized, "romaji", "romanji")) {
            return ImportTargetField.ROMAJI;
        }
        if (matches(normalized, "onyomi", "on", "on reading", "on yomi")) {
            return ImportTargetField.ONYOMI;
        }
        if (matches(normalized, "kunyomi", "kun", "kun reading", "kun yomi")) {
            return ImportTargetField.KUNYOMI;
        }
        if (matches(normalized, "example", "sentence", "example sentence", "vi du", "cau vi du", "例文")) {
            return ImportTargetField.EXAMPLE;
        }
        if (matches(normalized, "example translation", "sentence translation", "dich cau", "dich vi du")) {
            return ImportTargetField.EXAMPLE_TRANSLATION;
        }
        if (matches(normalized, "note", "notes", "hint", "memo", "ghi chu")) {
            return ImportTargetField.NOTE;
        }
        if (matches(normalized, "tag", "tags", "label", "labels")) {
            return ImportTargetField.TAGS;
        }
        return ImportTargetField.IGNORE;
    }

    private ImportTargetField suggestFieldFromSamples(List<String> samples) {
        if (samples == null || samples.isEmpty()) return ImportTargetField.IGNORE;

        int japanese = 0;
        int latinOnly = 0;
        int noteLike = 0;
        int tagLike = 0;
        for (String sample : samples) {
            String normalized = normalizeLabel(sample);
            if (containsJapanese(sample)) japanese++;
            if (containsLatin(sample) && !containsJapanese(sample)) latinOnly++;
            if (looksLikeNote(sample, normalized)) noteLike++;
            if (looksLikeTags(sample)) tagLike++;
        }

        if (noteLike >= Math.max(1, samples.size() / 2)) return ImportTargetField.NOTE;
        if (tagLike >= Math.max(2, samples.size() / 2)) return ImportTargetField.TAGS;
        if (japanese > 0 && japanese >= latinOnly) return ImportTargetField.FRONT;
        if (latinOnly > 0) return ImportTargetField.BACK;
        return ImportTargetField.IGNORE;
    }

    private List<String> sampleColumnValues(List<String[]> rows, int startIndex, int columnIndex, int limit) {
        List<String> samples = new ArrayList<>();
        if (rows == null) return samples;
        for (int i = Math.max(0, startIndex); i < rows.size() && samples.size() < limit; i++) {
            String[] row = rows.get(i);
            if (row == null || columnIndex >= row.length) continue;
            String value = trimToNull(row[columnIndex]);
            if (value != null) samples.add(value);
        }
        return samples;
    }

    private boolean looksLikeNote(String sample, String normalized) {
        if (isBlank(sample)) return false;
        return normalized.contains(" on:")
                || normalized.startsWith("on:")
                || normalized.contains(" kun:")
                || normalized.startsWith("kun:")
                || normalized.contains("note")
                || normalized.contains("memo")
                || normalized.contains("例文")
                || normalized.contains("example")
                || sample.contains("ON:")
                || sample.contains("KUN:");
    }

    private boolean looksLikeTags(String sample) {
        if (isBlank(sample)) return false;
        String trimmed = sample.trim();
        if (trimmed.length() > 80) return false;
        return (trimmed.contains(";") || trimmed.contains("|"))
                && !containsJapanese(trimmed)
                && trimmed.split("[;|]").length >= 2;
    }

    private boolean containsJapanese(String value) {
        return value != null && value.matches(".*[\\p{InHiragana}\\p{InKatakana}\\p{InCJKUnifiedIdeographs}].*");
    }

    private boolean containsLatin(String value) {
        return value != null && value.matches(".*\\p{IsLatin}.*");
    }

    private boolean looksLikeHeader(List<String[]> rows) {
        if (rows == null || rows.isEmpty()) return false;
        String[] firstRow = rows.get(0);
        int hits = 0;
        for (String value : firstRow) {
            if (suggestField(value) != ImportTargetField.IGNORE) hits++;
        }
        if (hits == 0) return false;

        int firstRowColumns = firstRow != null ? firstRow.length : 0;
        List<String> firstValues = firstRow == null ? List.of() : Arrays.stream(firstRow)
                .map(this::trimToNull)
                .filter(Objects::nonNull)
                .toList();
        boolean allHeaderWords = !firstValues.isEmpty()
                && firstValues.stream().allMatch(value -> suggestField(value) != ImportTargetField.IGNORE);
        if (allHeaderWords) return true;

        int comparableRows = 0;
        int sameColumnRows = 0;
        for (int i = 1; i < rows.size() && comparableRows < 5; i++) {
            String[] row = rows.get(i);
            if (isBlankRow(row)) continue;
            comparableRows++;
            if (row.length == firstRowColumns) sameColumnRows++;
        }
        return hits >= 2 && sameColumnRows >= Math.max(1, comparableRows / 2);
    }

    private char detectDelimiter(String content) throws Exception {
        char[] candidates = new char[]{',', '\t', ';', '|'};
        char best = ',';
        int bestScore = -1;
        for (char candidate : candidates) {
            List<String[]> rows = readDelimitedRows(content, candidate).stream()
                    .filter(row -> !isBlankRow(row))
                    .limit(20)
                    .toList();
            if (rows.isEmpty()) continue;
            int multiColumnRows = 0;
            int totalColumns = 0;
            for (String[] row : rows) {
                if (row.length > 1) multiColumnRows++;
                totalColumns += row.length;
            }
            int score = (multiColumnRows * 100) + totalColumns;
            if (score > bestScore) {
                bestScore = score;
                best = candidate;
            }
        }
        return best;
    }

    private char delimiterFor(DelimiterOption option, String fileName) {
        if (option == null || option == DelimiterOption.AUTO) {
            return fileName.toLowerCase(Locale.ROOT).endsWith(".tsv") ? '\t' : ',';
        }
        return switch (option) {
            case COMMA -> ',';
            case TAB -> '\t';
            case SEMICOLON -> ';';
            case PIPE -> '|';
            case AUTO -> ',';
        };
    }

    private List<String[]> readDelimitedRows(String content, char separator) throws Exception {
        CSVParser parser = new CSVParserBuilder()
                .withSeparator(separator)
                .withIgnoreQuotations(false)
                .build();
        try (CSVReader reader = new CSVReaderBuilder(new StringReader(content))
                .withCSVParser(parser)
                .build()) {
            return reader.readAll();
        }
    }

    private List<String[]> readSpreadsheetRows(InputStream inputStream) throws Exception {
        List<String[]> rows = new ArrayList<>();
        try (Workbook workbook = WorkbookFactory.create(inputStream)) {
            Sheet sheet = firstReadableSheet(workbook);
            if (sheet == null) return rows;

            DataFormatter formatter = new DataFormatter(Locale.ROOT);
            FormulaEvaluator evaluator = workbook.getCreationHelper().createFormulaEvaluator();
            for (int rowIndex = sheet.getFirstRowNum(); rowIndex <= sheet.getLastRowNum(); rowIndex++) {
                Row row = sheet.getRow(rowIndex);
                if (row == null || row.getLastCellNum() <= 0) {
                    rows.add(new String[0]);
                    continue;
                }

                int cellCount = row.getLastCellNum();
                String[] values = new String[cellCount];
                for (int cellIndex = 0; cellIndex < cellCount; cellIndex++) {
                    values[cellIndex] = formattedCellValue(row, cellIndex, formatter, evaluator);
                }
                rows.add(values);
            }
        }
        return rows;
    }

    private Sheet firstReadableSheet(Workbook workbook) {
        for (int i = 0; i < workbook.getNumberOfSheets(); i++) {
            Sheet sheet = workbook.getSheetAt(i);
            if (sheet != null && sheet.getPhysicalNumberOfRows() > 0) return sheet;
        }
        return null;
    }

    private String formattedCellValue(Row row, int cellIndex, DataFormatter formatter, FormulaEvaluator evaluator) {
        if (row.getCell(cellIndex) == null) return "";
        try {
            return trimToEmpty(formatter.formatCellValue(row.getCell(cellIndex), evaluator));
        } catch (Exception ignored) {
            return trimToEmpty(formatter.formatCellValue(row.getCell(cellIndex)));
        }
    }

    private boolean isSupported(String fileName) {
        String lower = fileName.toLowerCase(Locale.ROOT);
        return SUPPORTED_EXTENSIONS.stream().anyMatch(lower::endsWith);
    }

    private boolean isSpreadsheet(String fileName) {
        String lower = fileName.toLowerCase(Locale.ROOT);
        return lower.endsWith(".xlsx") || lower.endsWith(".xls");
    }

    private String[] syntheticHeader(int columnCount) {
        String[] header = new String[columnCount];
        for (int i = 0; i < columnCount; i++) {
            header[i] = "Column " + (i + 1);
        }
        return header;
    }

    private List<String> buildLabels(String[] header, int columnCount) {
        List<String> labels = new ArrayList<>();
        for (int i = 0; i < columnCount; i++) {
            String label = i < header.length ? trimToNull(stripBom(header[i])) : null;
            labels.add(label != null ? label : "Column " + (i + 1));
        }
        return labels;
    }

    private Map<String, String> valuesFor(String[] row, int columnCount) {
        Map<String, String> values = new LinkedHashMap<>();
        for (int i = 0; i < columnCount; i++) {
            values.put(columnKey(i), i < row.length ? Objects.requireNonNullElse(row[i], "").trim() : "");
        }
        return values;
    }

    private List<String> sampleValues(List<ParsedRow> rows, String key) {
        return rows.stream()
                .map(row -> row.values().get(key))
                .filter(value -> value != null && !value.isBlank())
                .distinct()
                .limit(MAX_SAMPLE_VALUES)
                .toList();
    }

    private List<String> previewWarnings(ParsedRow row, Map<String, ImportTargetField> mapping) {
        List<String> warnings = new ArrayList<>();
        Optional<String> frontKey = findKey(mapping, ImportTargetField.FRONT);
        Optional<String> backKey = findKey(mapping, ImportTargetField.BACK);
        if (frontKey.isPresent() && isBlank(row.values().get(frontKey.get()))) warnings.add("Front is blank");
        if (backKey.isPresent() && isBlank(row.values().get(backKey.get()))) warnings.add("Back is blank");
        return warnings;
    }

    private Optional<String> findKey(Map<String, ImportTargetField> mapping, ImportTargetField target) {
        return mapping.entrySet().stream()
                .filter(entry -> entry.getValue() == target)
                .map(Map.Entry::getKey)
                .findFirst();
    }

    private int maxColumns(List<String[]> rows) {
        return rows.stream().mapToInt(row -> row != null ? row.length : 0).max().orElse(0);
    }

    private boolean isBlankRow(String[] row) {
        if (row == null || row.length == 0) return true;
        for (String value : row) {
            if (!isBlank(value)) return false;
        }
        return true;
    }

    private String printableDelimiter(char delimiter) {
        return delimiter == '\t' ? "TAB" : String.valueOf(delimiter);
    }

    private String columnKey(int index) {
        return "c" + index;
    }

    private boolean matches(String normalized, String... options) {
        for (String option : options) {
            if (normalized.equals(normalizeLabel(option))) return true;
        }
        return false;
    }

    private String normalizeLabel(String value) {
        if (value == null) return "";
        String noMarks = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "");
        return noMarks.trim().toLowerCase(Locale.ROOT).replaceAll("[_\\-]+", " ").replaceAll("\\s+", " ");
    }

    private String normalizeFront(String value) {
        return normalizeLabel(value);
    }

    private String first(EnumMap<ImportTargetField, List<String>> values, ImportTargetField field) {
        List<String> fieldValues = values.get(field);
        if (fieldValues == null || fieldValues.isEmpty()) return null;
        return fieldValues.get(0);
    }

    private String joined(EnumMap<ImportTargetField, List<String>> values, ImportTargetField field) {
        List<String> fieldValues = values.get(field);
        if (fieldValues == null || fieldValues.isEmpty()) return null;
        return joinNonBlank(fieldValues);
    }

    private Map<String, Object> asObjectMap(Map<String, String> values) {
        Map<String, Object> result = new LinkedHashMap<>();
        values.forEach(result::put);
        return result;
    }

    private ImportResultResponse resultResponse(ImportBatch batch, List<RowError> errors) {
        Deck deck = batch.getDeck();
        return ImportResultResponse.builder()
                .batchId(batch.getId())
                .deckId(deck != null ? deck.getId() : null)
                .deckTitle(deck != null ? deck.getTitle() : null)
                .status(batch.getStatus())
                .totalRows(batch.getTotalRows())
                .createdRows(batch.getCreatedRows())
                .updatedRows(batch.getUpdatedRows())
                .skippedRows(batch.getSkippedRows())
                .failedRows(batch.getFailedRows())
                .duplicateRows(batch.getDuplicateRows())
                .errors(errors != null ? errors : List.of())
                .build();
    }

    private String stripBom(String value) {
        if (value == null) return null;
        return value.startsWith("\uFEFF") ? value.substring(1) : value;
    }

    private String decodeText(byte[] bytes) {
        if (bytes == null || bytes.length == 0) return "";
        if (bytes.length >= 3
                && (bytes[0] & 0xFF) == 0xEF
                && (bytes[1] & 0xFF) == 0xBB
                && (bytes[2] & 0xFF) == 0xBF) {
            return new String(bytes, 3, bytes.length - 3, StandardCharsets.UTF_8);
        }
        if (bytes.length >= 2 && (bytes[0] & 0xFF) == 0xFE && (bytes[1] & 0xFF) == 0xFF) {
            return new String(bytes, 2, bytes.length - 2, StandardCharsets.UTF_16BE);
        }
        if (bytes.length >= 2 && (bytes[0] & 0xFF) == 0xFF && (bytes[1] & 0xFF) == 0xFE) {
            return new String(bytes, 2, bytes.length - 2, StandardCharsets.UTF_16LE);
        }
        return stripBom(new String(bytes, Charset.forName("UTF-8")));
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String trimToEmpty(String value) {
        return value == null ? "" : value.trim();
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private record ParsedUpload(
            Long userId,
            String fileName,
            String delimiter,
            boolean headerDetected,
            List<String> labels,
            List<ParsedRow> rows,
            Map<String, ImportTargetField> suggestedMapping
    ) {
    }

    private record ParsedRow(int rowNumber, Map<String, String> values) {
    }

    private record CardPayload(
            String front,
            String back,
            String reading,
            String romaji,
            String onyomi,
            String kunyomi,
            String example,
            String exampleTranslation,
            String note,
            List<String> tags
    ) {
    }

    private record TextCard(
            String front,
            List<String> examples,
            List<String> translations,
            List<String> notes
    ) {
    }

    private static class ImportCounters {
        int createdRows;
        int updatedRows;
        int skippedRows;
        int failedRows;
        int duplicateRows;
    }
}
