package com.example.starter_project_2025.domain.kanji_study.deck;

import com.example.starter_project_2025.domain.kanji_study.deck_item.KanjiDeckItem;
import com.example.starter_project_2025.domain.kanji_study.deck_item.KanjiDeckItemRepository;
import com.example.starter_project_2025.domain.kanji_study.detail.KanjiDetail;
import com.example.starter_project_2025.domain.kanji_study.detail.KanjiDetailRepository;
import com.example.starter_project_2025.exception.BusinessValidationException;
import com.example.starter_project_2025.exception.ResourceNotFoundException;
import com.example.starter_project_2025.security.UserPrincipal;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Group-level operations inside a kanji deck (the "study batch" overhaul):
 *
 * <ul>
 *   <li><b>split</b>  — chia một nhóm (hoặc cả deck) thành các nhóm nhỏ N kanji;</li>
 *   <li><b>merge</b>  — gộp các nhóm đã chọn (hoặc tất cả) thành một;</li>
 *   <li><b>paste</b>  — dán kanji từ clipboard FE vào deck (thành nhóm mới, bỏ qua trùng);</li>
 *   <li><b>remove</b> — bỏ kanji khỏi deck (vế "move" của cut/paste giữa hai deck).</li>
 * </ul>
 *
 * Groups are implicit — items sharing {@code groupIndex} form a group — so every
 * operation ends with {@link #renumber(List)} writing back sequential group and
 * order indexes.
 */
@Service
@Transactional
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class KanjiDeckOrganizeService {

    KanjiDeckRepository kanjiDeckRepository;
    KanjiDeckItemRepository kanjiDeckItemRepository;
    KanjiDetailRepository kanjiDetailRepository;

    public record SplitGroupRequest(Integer groupIndex, Integer size, Boolean repeat) {}
    public record MergeGroupsRequest(List<Integer> groupIndexes) {}
    public record KanjiIdsRequest(List<Long> kanjiIds) {}

    public record GroupOpResult(int groups, int totalKanji) {}
    public record PasteResult(int added, int skipped, int groups, int totalKanji) {}
    public record RemoveResult(int removed, int groups, int totalKanji) {}

    /* ── split ───────────────────────────────────────────────────── */

    public GroupOpResult split(Long deckId, SplitGroupRequest request) {
        loadEditableDeck(deckId);

        int size = request.size() != null ? request.size() : 10;
        if (size < 1) throw validation("size", "Số ký tự mỗi nhóm phải ≥ 1");

        List<List<KanjiDeckItem>> groups = loadGroups(deckId);
        if (groups.isEmpty()) throw validation("deckId", "Deck chưa có kanji nào");

        boolean repeat = Boolean.TRUE.equals(request.repeat());
        List<List<KanjiDeckItem>> result = new ArrayList<>();

        if (request.groupIndex() == null) {
            // Tách cả deck: bỏ ranh giới nhóm hiện tại, chia lại từ đầu theo size.
            List<KanjiDeckItem> all = groups.stream().flatMap(List::stream).toList();
            result.addAll(chunk(all, size));
        } else {
            int target = request.groupIndex();
            if (target < 0 || target >= groups.size()) {
                throw validation("groupIndex", "Nhóm không tồn tại");
            }
            for (int i = 0; i < groups.size(); i++) {
                List<KanjiDeckItem> group = groups.get(i);
                if (i != target || group.size() <= size) {
                    result.add(group);
                } else if (repeat) {
                    result.addAll(chunk(group, size));
                } else {
                    result.add(new ArrayList<>(group.subList(0, size)));
                    result.add(new ArrayList<>(group.subList(size, group.size())));
                }
            }
        }

        renumber(result);
        int total = result.stream().mapToInt(List::size).sum();
        return new GroupOpResult(result.size(), total);
    }

    /* ── merge ───────────────────────────────────────────────────── */

    public GroupOpResult merge(Long deckId, MergeGroupsRequest request) {
        loadEditableDeck(deckId);

        List<List<KanjiDeckItem>> groups = loadGroups(deckId);
        if (groups.size() < 2) throw validation("groupIndexes", "Deck chỉ có một nhóm, không có gì để gộp");

        Set<Integer> targets;
        if (request == null || request.groupIndexes() == null || request.groupIndexes().isEmpty()) {
            targets = new HashSet<>();
            for (int i = 0; i < groups.size(); i++) targets.add(i);
        } else {
            targets = new HashSet<>(request.groupIndexes());
            for (Integer idx : targets) {
                if (idx == null || idx < 0 || idx >= groups.size()) {
                    throw validation("groupIndexes", "Nhóm không tồn tại: " + idx);
                }
            }
            if (targets.size() < 2) throw validation("groupIndexes", "Cần chọn ít nhất 2 nhóm để gộp");
        }

        int anchor = targets.stream().min(Integer::compareTo).orElse(0);
        List<KanjiDeckItem> merged = new ArrayList<>();
        List<List<KanjiDeckItem>> result = new ArrayList<>();
        for (int i = 0; i < groups.size(); i++) {
            if (targets.contains(i)) {
                merged.addAll(groups.get(i));
                if (i == anchor) result.add(merged);
            } else {
                result.add(groups.get(i));
            }
        }

        renumber(result);
        int total = result.stream().mapToInt(List::size).sum();
        return new GroupOpResult(result.size(), total);
    }

    /* ── paste (copy into deck) ──────────────────────────────────── */

    public PasteResult paste(Long deckId, KanjiIdsRequest request) {
        KanjiDeck deck = loadEditableDeck(deckId);
        List<Long> kanjiIds = requireKanjiIds(request);

        List<List<KanjiDeckItem>> groups = loadGroups(deckId);
        Map<Long, KanjiDeckItem> existing = kanjiDeckItemRepository
                .findByDeckIdAndKanjiIdIn(deckId, kanjiIds).stream()
                .collect(Collectors.toMap(i -> i.getKanji().getId(), i -> i, (a, b) -> a));

        int newGroupIndex = groups.size();
        int orderIndex = groups.stream().mapToInt(List::size).sum();
        List<KanjiDeckItem> pastedGroup = new ArrayList<>();
        int skipped = 0;

        for (Long kanjiId : kanjiIds) {
            KanjiDeckItem item = existing.get(kanjiId);
            if (item != null && !Boolean.TRUE.equals(item.getIsDeleted())) {
                skipped++;
                continue;
            }
            if (item == null) {
                KanjiDetail kanji = kanjiDetailRepository.findById(kanjiId)
                        .orElseThrow(() -> validation("kanjiIds", "Kanji không tồn tại: " + kanjiId));
                item = KanjiDeckItem.builder().deck(deck).kanji(kanji).build();
                item.setIsActive(true);
            }
            // revive a soft-deleted row instead of inserting (hard unique deck+kanji)
            item.setIsDeleted(false);
            item.setGroupIndex(newGroupIndex);
            item.setOrderIndex(orderIndex++);
            pastedGroup.add(item);
        }

        if (!pastedGroup.isEmpty()) {
            kanjiDeckItemRepository.saveAll(pastedGroup);
            groups.add(pastedGroup);
        }
        syncTotal(deck, deckId);

        int total = groups.stream().mapToInt(List::size).sum();
        return new PasteResult(pastedGroup.size(), skipped, groups.size(), total);
    }

    /* ── remove (move out of deck) ───────────────────────────────── */

    public RemoveResult removeItems(Long deckId, KanjiIdsRequest request) {
        KanjiDeck deck = loadEditableDeck(deckId);
        Set<Long> kanjiIds = new HashSet<>(requireKanjiIds(request));

        List<List<KanjiDeckItem>> groups = loadGroups(deckId);
        int removed = 0;
        List<List<KanjiDeckItem>> result = new ArrayList<>();
        List<KanjiDeckItem> deleted = new ArrayList<>();

        for (List<KanjiDeckItem> group : groups) {
            List<KanjiDeckItem> kept = new ArrayList<>();
            for (KanjiDeckItem item : group) {
                if (kanjiIds.contains(item.getKanji().getId())) {
                    item.setIsDeleted(true);
                    deleted.add(item);
                    removed++;
                } else {
                    kept.add(item);
                }
            }
            if (!kept.isEmpty()) result.add(kept); // nhóm rỗng tự biến mất
        }

        kanjiDeckItemRepository.saveAll(deleted);
        renumber(result);
        syncTotal(deck, deckId);

        int total = result.stream().mapToInt(List::size).sum();
        return new RemoveResult(removed, result.size(), total);
    }

    /* ── helpers ─────────────────────────────────────────────────── */

    /** Deck must exist and be editable by the current user (owner, or a system/shared deck). */
    private KanjiDeck loadEditableDeck(Long deckId) {
        KanjiDeck deck = kanjiDeckRepository.findById(deckId)
                .filter(d -> !Boolean.TRUE.equals(d.getIsDeleted()))
                .orElseThrow(() -> new ResourceNotFoundException("Kanji deck not found"));
        Long ownerId = deck.getUser() != null ? deck.getUser().getId() : null;
        if (ownerId != null && !ownerId.equals(currentUserId())) {
            throw validation("deckId", "Bạn không có quyền chỉnh deck này");
        }
        return deck;
    }

    private Long currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserPrincipal up) return up.getId();
        return null;
    }

    /** Items of the deck partitioned into groups, both levels in stored order. */
    private List<List<KanjiDeckItem>> loadGroups(Long deckId) {
        List<KanjiDeckItem> items =
                kanjiDeckItemRepository.findByDeckIdAndIsDeletedFalseOrderByGroupIndexAscOrderIndexAsc(deckId);
        Map<Integer, List<KanjiDeckItem>> byGroup = new LinkedHashMap<>();
        for (KanjiDeckItem item : items) {
            byGroup.computeIfAbsent(item.getGroupIndex(), k -> new ArrayList<>()).add(item);
        }
        return new ArrayList<>(byGroup.values());
    }

    private static List<List<KanjiDeckItem>> chunk(List<KanjiDeckItem> items, int size) {
        List<List<KanjiDeckItem>> chunks = new ArrayList<>();
        for (int from = 0; from < items.size(); from += size) {
            chunks.add(new ArrayList<>(items.subList(from, Math.min(from + size, items.size()))));
        }
        return chunks;
    }

    /** Write back sequential groupIndex (0..n-1) and a global running orderIndex. */
    private void renumber(List<List<KanjiDeckItem>> groups) {
        List<KanjiDeckItem> dirty = new ArrayList<>();
        int order = 0;
        for (int g = 0; g < groups.size(); g++) {
            for (KanjiDeckItem item : groups.get(g)) {
                if (item.getGroupIndex() != g || item.getOrderIndex() != order) {
                    item.setGroupIndex(g);
                    item.setOrderIndex(order);
                    dirty.add(item);
                }
                order++;
            }
        }
        kanjiDeckItemRepository.saveAll(dirty);
    }

    private void syncTotal(KanjiDeck deck, Long deckId) {
        deck.setTotalKanji((int) kanjiDeckItemRepository.countByDeckIdAndIsDeletedFalse(deckId));
        kanjiDeckRepository.save(deck);
    }

    private List<Long> requireKanjiIds(KanjiIdsRequest request) {
        if (request == null || request.kanjiIds() == null || request.kanjiIds().isEmpty()) {
            throw validation("kanjiIds", "Chưa chọn kanji nào");
        }
        return request.kanjiIds().stream().filter(Objects::nonNull).distinct().toList();
    }

    private static BusinessValidationException validation(String field, String message) {
        Map<String, List<String>> errors = new LinkedHashMap<>();
        errors.put(field, List.of(message));
        return new BusinessValidationException(errors);
    }
}
