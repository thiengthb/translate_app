package com.example.starter_project_2025.system.dictionary.notebook;

import com.example.starter_project_2025.exception.BadRequestException;
import com.example.starter_project_2025.exception.ResourceNotFoundException;
import com.example.starter_project_2025.system.dictionary.DictionaryService;
import com.example.starter_project_2025.system.rbac.user.UserRepository;
import com.example.starter_project_2025.system.words.kanji.Kanji;
import com.example.starter_project_2025.system.words.kanji.KanjiRepository;
import com.example.starter_project_2025.system.words.word.Word;
import com.example.starter_project_2025.system.words.word.WordRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Sổ tay từ vựng/kanji per-user, hỗ trợ NHIỀU sổ tay (kiểu Mazii). Mọi thao
 * tác scope theo userId lấy từ principal (controller truyền vào) — không tin
 * id từ client. Mỗi user có một sổ tay mặc định, tạo lười khi cần.
 */
@Service
@Transactional
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class NotebookServiceImpl implements NotebookService {

    NotebookRepository      notebookRepository;
    NotebookEntryRepository entryRepository;
    WordRepository          wordRepository;
    KanjiRepository         kanjiRepository;
    UserRepository          userRepository;
    DictionaryService       dictionaryService;

    private static final String DEFAULT_NOTEBOOK_NAME = "Sổ tay của tôi";

    // ══════════════════════════════════════════════════════════════════
    // Quản lý sổ tay
    // ══════════════════════════════════════════════════════════════════

    @Override
    @Transactional
    public List<NotebookSummary> listNotebooks(Long userId) {
        List<Notebook> notebooks = notebookRepository.findByUserIdOrderBySortOrderAscIdAsc(userId);
        if (notebooks.isEmpty()) {
            notebooks = List.of(getOrCreateDefault(userId));
        }
        // Đếm số mục theo từng sổ tay từ một lần load (mục đã được lọc live).
        Map<Long, long[]> counts = new LinkedHashMap<>(); // nid -> [words, kanjis]
        for (NotebookEntry e : entryRepository.findAllForUser(userId)) {
            long[] c = counts.computeIfAbsent(e.getNotebook().getId(), k -> new long[2]);
            if (e.getWord() != null) c[0]++;
            else if (e.getKanji() != null) c[1]++;
        }
        return notebooks.stream().map(n -> {
            long[] c = counts.getOrDefault(n.getId(), new long[2]);
            return toSummary(n, c[0], c[1]);
        }).toList();
    }

    @Override
    public NotebookSummary createNotebook(Long userId, String name, String color) {
        Notebook nb = notebookRepository.save(Notebook.builder()
                .user(userRepository.getReferenceById(userId))
                .name(normalizeName(name))
                .color(normalizeColor(color))
                .isDefault(Boolean.FALSE)
                .sortOrder((int) notebookRepository.countByUserId(userId))
                .build());
        return toSummary(nb, 0, 0);
    }

    @Override
    public NotebookSummary updateNotebook(Long userId, Long notebookId, String name, String color) {
        Notebook nb = requireNotebook(userId, notebookId);
        nb.setName(normalizeName(name));
        nb.setColor(normalizeColor(color));
        notebookRepository.save(nb);
        NotebookResponse entries = getNotebookEntries(userId, notebookId);
        return toSummary(nb, entries.getWords().size(), entries.getKanjis().size());
    }

    @Override
    public void deleteNotebook(Long userId, Long notebookId) {
        Notebook nb = requireNotebook(userId, notebookId);
        if (Boolean.TRUE.equals(nb.getIsDefault())) {
            throw new BadRequestException("Không thể xóa sổ tay mặc định");
        }
        entryRepository.deleteByNotebookId(notebookId);
        notebookRepository.delete(nb);
    }

    // ══════════════════════════════════════════════════════════════════
    // Mục trong một sổ tay cụ thể
    // ══════════════════════════════════════════════════════════════════

    @Override
    @Transactional(readOnly = true)
    public NotebookResponse getNotebookEntries(Long userId, Long notebookId) {
        requireNotebook(userId, notebookId);
        return toResponse(entryRepository.findAllForUserAndNotebook(userId, notebookId));
    }

    @Override
    public NotebookResponse.WordEntry addWord(Long userId, Long notebookId, Long wordId) {
        Notebook nb = requireNotebook(userId, notebookId);
        NotebookEntry existing = entryRepository.findByNotebookIdAndWordId(notebookId, wordId).orElse(null);
        if (existing != null) return toWordEntry(existing); // idempotent
        Word word = findLiveWord(wordId);
        return toWordEntry(insertIgnoringDuplicate(NotebookEntry.builder()
                .notebook(nb)
                .user(userRepository.getReferenceById(userId))
                .word(word)
                .build()));
    }

    @Override
    public void removeWord(Long userId, Long notebookId, Long wordId) {
        requireNotebook(userId, notebookId);
        entryRepository.findByNotebookIdAndWordId(notebookId, wordId)
                .ifPresent(entryRepository::delete); // hard delete
    }

    @Override
    public NotebookResponse.KanjiEntry addKanji(Long userId, Long notebookId, String character) {
        Notebook nb = requireNotebook(userId, notebookId);
        Kanji kanji = findLiveKanji(character);
        NotebookEntry existing = entryRepository.findByNotebookIdAndKanjiId(notebookId, kanji.getId()).orElse(null);
        if (existing != null) return toKanjiEntry(existing);
        return toKanjiEntry(insertIgnoringDuplicate(NotebookEntry.builder()
                .notebook(nb)
                .user(userRepository.getReferenceById(userId))
                .kanji(kanji)
                .build()));
    }

    @Override
    public void removeKanji(Long userId, Long notebookId, String character) {
        requireNotebook(userId, notebookId);
        kanjiRepository.findByCharacter(character)
                .flatMap(k -> entryRepository.findByNotebookIdAndKanjiId(notebookId, k.getId()))
                .ifPresent(entryRepository::delete);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Long> notebookIdsForWord(Long userId, Long wordId) {
        return entryRepository.findNotebookIdsByUserIdAndWordId(userId, wordId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Long> notebookIdsForKanji(Long userId, String character) {
        return kanjiRepository.findByCharacter(character)
                .map(k -> entryRepository.findNotebookIdsByUserIdAndKanjiId(userId, k.getId()))
                .orElseGet(List::of);
    }

    // ══════════════════════════════════════════════════════════════════
    // Tổng hợp / tương thích ngược
    // ══════════════════════════════════════════════════════════════════

    @Override
    @Transactional(readOnly = true)
    public NotebookResponse getNotebook(Long userId) {
        // Gộp mọi sổ tay, loại trùng theo word.id / kanji.character (giữ mục mới nhất).
        List<NotebookEntry> all = entryRepository.findAllForUser(userId); // đã ORDER BY id DESC
        Map<Long, NotebookEntry> words = new LinkedHashMap<>();
        Map<String, NotebookEntry> kanjis = new LinkedHashMap<>();
        for (NotebookEntry e : all) {
            if (e.getWord() != null) words.putIfAbsent(e.getWord().getId(), e);
            else if (e.getKanji() != null) kanjis.putIfAbsent(e.getKanji().getCharacter(), e);
        }
        return NotebookResponse.builder()
                .words(words.values().stream().map(this::toWordEntry).toList())
                .kanjis(kanjis.values().stream().map(this::toKanjiEntry).toList())
                .build();
    }

    @Override
    public NotebookResponse.WordEntry saveWordToDefault(Long userId, Long wordId) {
        return addWord(userId, getOrCreateDefault(userId).getId(), wordId);
    }

    @Override
    public NotebookResponse.KanjiEntry saveKanjiToDefault(Long userId, String character) {
        return addKanji(userId, getOrCreateDefault(userId).getId(), character);
    }

    @Override
    public void removeWordEverywhere(Long userId, Long wordId) {
        entryRepository.deleteByUserIdAndWordId(userId, wordId);
    }

    @Override
    public void removeKanjiEverywhere(Long userId, String character) {
        kanjiRepository.findByCharacter(character)
                .ifPresent(k -> entryRepository.deleteByUserIdAndKanjiId(userId, k.getId()));
    }

    @Override
    public void updateNote(Long userId, Long entryId, String note) {
        NotebookEntry entry = entryRepository.findByIdAndUserId(entryId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("NotebookEntry", "id", entryId));
        String trimmed = note == null ? null : note.trim();
        entry.setNote(trimmed == null || trimmed.isEmpty() ? null : trimmed);
        entryRepository.save(entry);
    }

    @Override
    public void clearAll(Long userId) {
        entryRepository.deleteByUserId(userId);
    }

    @Override
    public NotebookResponse sync(Long userId, NotebookSyncRequest request) {
        Notebook def = getOrCreateDefault(userId);

        // Insert theo id tăng dần để các transaction sync chạy đua lấy lock cùng
        // chiều → giảm xác suất deadlock (controller vẫn có retry).
        if (request.getWordIds() != null && !request.getWordIds().isEmpty()) {
            List<Word> words = wordRepository.findAllById(request.getWordIds())
                    .stream().sorted(Comparator.comparing(Word::getId)).toList();
            for (Word w : words) {
                if (isLive(w) && entryRepository.findByNotebookIdAndWordId(def.getId(), w.getId()).isEmpty()) {
                    insertIgnoringDuplicate(NotebookEntry.builder()
                            .notebook(def)
                            .user(userRepository.getReferenceById(userId))
                            .word(w)
                            .build());
                }
            }
        }
        if (request.getKanjiChars() != null && !request.getKanjiChars().isEmpty()) {
            List<Kanji> ks = kanjiRepository.findByCharacterInAndIsDeletedFalse(request.getKanjiChars())
                    .stream().sorted(Comparator.comparing(Kanji::getId)).toList();
            for (Kanji k : ks) {
                if (Boolean.TRUE.equals(k.getIsActive())
                        && entryRepository.findByNotebookIdAndKanjiId(def.getId(), k.getId()).isEmpty()) {
                    insertIgnoringDuplicate(NotebookEntry.builder()
                            .notebook(def)
                            .user(userRepository.getReferenceById(userId))
                            .kanji(k)
                            .build());
                }
            }
        }
        return getNotebook(userId);
    }

    // ══════════════════════════════════════════════════════════════════
    // Helpers
    // ══════════════════════════════════════════════════════════════════

    private Notebook getOrCreateDefault(Long userId) {
        return notebookRepository.findFirstByUserIdAndIsDefaultTrue(userId)
                .orElseGet(() -> {
                    // Nếu user đã có sổ tay (không default) thì vẫn tạo default riêng.
                    try {
                        return notebookRepository.save(Notebook.builder()
                                .user(userRepository.getReferenceById(userId))
                                .name(DEFAULT_NOTEBOOK_NAME)
                                .isDefault(Boolean.TRUE)
                                .sortOrder(0)
                                .build());
                    } catch (DataIntegrityViolationException e) {
                        return notebookRepository.findFirstByUserIdAndIsDefaultTrue(userId).orElseThrow(() -> e);
                    }
                });
    }

    private Notebook requireNotebook(Long userId, Long notebookId) {
        return notebookRepository.findByIdAndUserId(notebookId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Notebook", "id", notebookId));
    }

    /** Hai request lưu song song có thể đụng unique constraint → coi như đã lưu. */
    private NotebookEntry insertIgnoringDuplicate(NotebookEntry entry) {
        try {
            return entryRepository.save(entry);
        } catch (DataIntegrityViolationException e) {
            Long nid = entry.getNotebook().getId();
            if (entry.getWord() != null) {
                return entryRepository.findByNotebookIdAndWordId(nid, entry.getWord().getId()).orElseThrow(() -> e);
            }
            return entryRepository.findByNotebookIdAndKanjiId(nid, entry.getKanji().getId()).orElseThrow(() -> e);
        }
    }

    private static String normalizeName(String name) {
        return name == null ? DEFAULT_NOTEBOOK_NAME : name.trim();
    }

    private static String normalizeColor(String color) {
        if (color == null) return null;
        String t = color.trim();
        return t.isEmpty() ? null : t;
    }

    private Word findLiveWord(Long wordId) {
        return wordRepository.findById(wordId)
                .filter(NotebookServiceImpl::isLive)
                .orElseThrow(() -> new ResourceNotFoundException("Word", "id", wordId));
    }

    private Kanji findLiveKanji(String character) {
        return kanjiRepository.findByCharacter(character)
                .filter(k -> Boolean.FALSE.equals(k.getIsDeleted()) && Boolean.TRUE.equals(k.getIsActive()))
                .orElseThrow(() -> new ResourceNotFoundException("Kanji", "character", character));
    }

    private static boolean isLive(Word w) {
        return Boolean.FALSE.equals(w.getIsDeleted()) && Boolean.TRUE.equals(w.getIsActive());
    }

    private NotebookResponse toResponse(List<NotebookEntry> entries) {
        List<NotebookResponse.WordEntry> words = new ArrayList<>();
        List<NotebookResponse.KanjiEntry> kanjis = new ArrayList<>();
        for (NotebookEntry e : entries) {
            if (e.getWord() != null) words.add(toWordEntry(e));
            else if (e.getKanji() != null) kanjis.add(toKanjiEntry(e));
        }
        return NotebookResponse.builder().words(words).kanjis(kanjis).build();
    }

    private NotebookSummary toSummary(Notebook n, long wordCount, long kanjiCount) {
        return NotebookSummary.builder()
                .id(n.getId())
                .name(n.getName())
                .color(n.getColor())
                .isDefault(Boolean.TRUE.equals(n.getIsDefault()))
                .sortOrder(n.getSortOrder() == null ? 0 : n.getSortOrder())
                .wordCount(wordCount)
                .kanjiCount(kanjiCount)
                .createdAt(n.getCreatedAt())
                .build();
    }

    private NotebookResponse.WordEntry toWordEntry(NotebookEntry e) {
        return NotebookResponse.WordEntry.builder()
                .entryId(e.getId())
                .note(e.getNote())
                .savedAt(e.getCreatedAt())
                .word(dictionaryService.toWordResult(e.getWord()))
                .build();
    }

    private NotebookResponse.KanjiEntry toKanjiEntry(NotebookEntry e) {
        return NotebookResponse.KanjiEntry.builder()
                .entryId(e.getId())
                .note(e.getNote())
                .savedAt(e.getCreatedAt())
                .kanji(dictionaryService.toKanjiResult(e.getKanji()))
                .build();
    }
}