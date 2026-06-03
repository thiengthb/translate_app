package com.example.starter_project_2025.system.dictionary.notebook;

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

import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Sổ tay từ vựng/kanji per-user. Mọi thao tác đều scope theo userId lấy từ
 * principal (controller truyền vào) — không tin id từ client.
 */
@Service
@Transactional
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class NotebookServiceImpl implements NotebookService {

    NotebookEntryRepository notebookRepository;
    WordRepository          wordRepository;
    KanjiRepository         kanjiRepository;
    UserRepository          userRepository;
    DictionaryService       dictionaryService;

    @Override
    @Transactional(readOnly = true)
    public NotebookResponse getNotebook(Long userId) {
        List<NotebookEntry> entries = notebookRepository.findAllForUser(userId);
        return NotebookResponse.builder()
                .words(entries.stream()
                        .filter(e -> e.getWord() != null)
                        .map(this::toWordEntry)
                        .toList())
                .kanjis(entries.stream()
                        .filter(e -> e.getKanji() != null)
                        .map(this::toKanjiEntry)
                        .toList())
                .build();
    }

    @Override
    public NotebookResponse.WordEntry saveWord(Long userId, Long wordId) {
        NotebookEntry existing = notebookRepository.findByUserIdAndWordId(userId, wordId).orElse(null);
        if (existing != null) {
            return toWordEntry(existing); // idempotent — lưu lại từ đã lưu thì trả mục cũ
        }
        Word word = findLiveWord(wordId);
        return toWordEntry(insertIgnoringDuplicate(NotebookEntry.builder()
                .user(userRepository.getReferenceById(userId))
                .word(word)
                .build()));
    }

    @Override
    public void removeWord(Long userId, Long wordId) {
        notebookRepository.findByUserIdAndWordId(userId, wordId)
                .ifPresent(notebookRepository::delete); // hard delete (xem NotebookEntry javadoc)
    }

    @Override
    public NotebookResponse.KanjiEntry saveKanji(Long userId, String character) {
        Kanji kanji = findLiveKanji(character);
        NotebookEntry existing = notebookRepository
                .findByUserIdAndKanjiId(userId, kanji.getId()).orElse(null);
        if (existing != null) {
            return toKanjiEntry(existing);
        }
        return toKanjiEntry(insertIgnoringDuplicate(NotebookEntry.builder()
                .user(userRepository.getReferenceById(userId))
                .kanji(kanji)
                .build()));
    }

    @Override
    public void removeKanji(Long userId, String character) {
        kanjiRepository.findByCharacter(character)
                .flatMap(k -> notebookRepository.findByUserIdAndKanjiId(userId, k.getId()))
                .ifPresent(notebookRepository::delete);
    }

    @Override
    public void updateNote(Long userId, Long entryId, String note) {
        NotebookEntry entry = notebookRepository.findByIdAndUserId(entryId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("NotebookEntry", "id", entryId));
        String trimmed = note == null ? null : note.trim();
        entry.setNote(trimmed == null || trimmed.isEmpty() ? null : trimmed);
        notebookRepository.save(entry);
    }

    @Override
    public void clearAll(Long userId) {
        notebookRepository.deleteByUserId(userId);
    }

    @Override
    public NotebookResponse sync(Long userId, NotebookSyncRequest request) {
        List<NotebookEntry> entries = notebookRepository.findAllForUser(userId);
        Set<Long> savedWordIds = new HashSet<>();
        Set<Long> savedKanjiIds = new HashSet<>();
        for (NotebookEntry e : entries) {
            if (e.getWord() != null)  savedWordIds.add(e.getWord().getId());
            if (e.getKanji() != null) savedKanjiIds.add(e.getKanji().getId());
        }

        // Insert theo thứ tự id tăng dần: các transaction sync chạy đua sẽ lấy
        // lock cùng chiều → giảm hẳn xác suất deadlock (controller vẫn có retry).
        if (request.getWordIds() != null && !request.getWordIds().isEmpty()) {
            List<Word> wordsToSync = wordRepository.findAllById(request.getWordIds())
                    .stream().sorted(Comparator.comparing(Word::getId)).toList();
            for (Word w : wordsToSync) {
                if (isLive(w) && !savedWordIds.contains(w.getId())) {
                    insertIgnoringDuplicate(NotebookEntry.builder()
                            .user(userRepository.getReferenceById(userId))
                            .word(w)
                            .build());
                }
            }
        }
        if (request.getKanjiChars() != null && !request.getKanjiChars().isEmpty()) {
            List<Kanji> kanjisToSync = kanjiRepository
                    .findByCharacterInAndIsDeletedFalse(request.getKanjiChars())
                    .stream().sorted(Comparator.comparing(Kanji::getId)).toList();
            for (Kanji k : kanjisToSync) {
                if (Boolean.TRUE.equals(k.getIsActive()) && !savedKanjiIds.contains(k.getId())) {
                    insertIgnoringDuplicate(NotebookEntry.builder()
                            .user(userRepository.getReferenceById(userId))
                            .kanji(k)
                            .build());
                }
            }
        }
        return getNotebook(userId);
    }

    // ── Helpers ────────────────────────────────────────────────────────

    /** Hai request lưu song song có thể đụng unique constraint → coi như đã lưu. */
    private NotebookEntry insertIgnoringDuplicate(NotebookEntry entry) {
        try {
            return notebookRepository.save(entry);
        } catch (DataIntegrityViolationException e) {
            if (entry.getWord() != null) {
                return notebookRepository
                        .findByUserIdAndWordId(entry.getUser().getId(), entry.getWord().getId())
                        .orElseThrow(() -> e);
            }
            return notebookRepository
                    .findByUserIdAndKanjiId(entry.getUser().getId(), entry.getKanji().getId())
                    .orElseThrow(() -> e);
        }
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