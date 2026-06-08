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
    private static final Set<String> SUPPORTED_EXTENSIONS = Set.of(".csv", ".tsv", ".txt");
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
            throw new BadRequestException("Only .csv, .tsv and .txt files are supported");
        }

        try {
            String content = new String(file.getBytes(), StandardCharsets.UTF_8);
            content = stripBom(content);

            Optional<ParsedUpload> structuredText = parseStructuredTextUpload(content, fileName, userId);
            if (structuredText.isPresent()) {
                String token = UUID.randomUUID().toString();
                ParsedUpload upload = structuredText.get();
                previewCache.put(token, upload);
                return buildPreviewResponse(token, upload, normalizePreviewPage(previewPage), normalizePreviewRows(previewRows));
            }

            char delimiter = delimiterOption == null || delimiterOption == DelimiterOption.AUTO
                    ? detectDelimiter(content)
                    : delimiterFor(delimiterOption, fileName);

            List<String[]> rawRows = readDelimitedRows(content, delimiter);
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

            boolean hasHeader = headerOverride != null ? headerOverride : looksLikeHeader(rawRows.get(0));
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
            ParsedUpload upload = new ParsedUpload(userId, fileName, delimiter, hasHeader, labels, parsedRows, mapping);
            previewCache.put(token, upload);

            return buildPreviewResponse(token, upload, normalizePreviewPage(previewPage), normalizePreviewRows(previewRows));
        } catch (BadRequestException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new BadRequestException("Could not parse import file: " + ex.getMessage());
        }
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
                .delimiter(printableDelimiter(upload.delimiter()))
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
                first(values, ImportTargetField.FRONT),
                first(values, ImportTargetField.BACK),
                first(values, ImportTargetField.READING),
                first(values, ImportTargetField.ROMAJI),
                first(values, ImportTargetField.ONYOMI),
                first(values, ImportTargetField.KUNYOMI),
                first(values, ImportTargetField.EXAMPLE),
                first(values, ImportTargetField.EXAMPLE_TRANSLATION),
                first(values, ImportTargetField.NOTE),
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
                current = new TextCard(cleanNumberedFront(line), new ArrayList<>(), new ArrayList<>(), new ArrayList<>());
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

        return Optional.of(new ParsedUpload(userId, fileName, '\n', false, labels, rows, mapping));
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

    private ImportTargetField suggestField(String label) {
        String normalized = normalizeLabel(label);
        if (matches(normalized, "front", "term", "word", "expression", "japanese", "kanji", "question")) {
            return ImportTargetField.FRONT;
        }
        if (matches(normalized, "back", "meaning", "definition", "answer", "vietnamese", "translation", "nghia")) {
            return ImportTargetField.BACK;
        }
        if (matches(normalized, "reading", "kana", "furigana", "hiragana")) {
            return ImportTargetField.READING;
        }
        if (matches(normalized, "romaji", "romanji")) {
            return ImportTargetField.ROMAJI;
        }
        if (matches(normalized, "onyomi", "on", "on reading")) {
            return ImportTargetField.ONYOMI;
        }
        if (matches(normalized, "kunyomi", "kun", "kun reading")) {
            return ImportTargetField.KUNYOMI;
        }
        if (matches(normalized, "example", "sentence", "example sentence")) {
            return ImportTargetField.EXAMPLE;
        }
        if (matches(normalized, "example translation", "sentence translation")) {
            return ImportTargetField.EXAMPLE_TRANSLATION;
        }
        if (matches(normalized, "note", "notes", "hint", "memo")) {
            return ImportTargetField.NOTE;
        }
        if (matches(normalized, "tag", "tags", "label", "labels")) {
            return ImportTargetField.TAGS;
        }
        return ImportTargetField.IGNORE;
    }

    private boolean looksLikeHeader(String[] firstRow) {
        int hits = 0;
        for (String value : firstRow) {
            if (suggestField(value) != ImportTargetField.IGNORE) hits++;
        }
        return hits > 0;
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

    private boolean isSupported(String fileName) {
        String lower = fileName.toLowerCase(Locale.ROOT);
        return SUPPORTED_EXTENSIONS.stream().anyMatch(lower::endsWith);
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

    private String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private record ParsedUpload(
            Long userId,
            String fileName,
            char delimiter,
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
