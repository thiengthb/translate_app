package com.example.starter_project_2025.system.dictionary.notebook;

import com.example.starter_project_2025.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.dao.PessimisticLockingFailureException;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.function.Supplier;

/**
 * Sổ tay từ vựng/kanji của user hiện hành — hỗ trợ NHIỀU sổ tay (kiểu Mazii).
 * Mọi endpoint yêu cầu đăng nhập và chỉ thao tác trên dữ liệu của chính
 * principal — không endpoint nào nhận userId từ client (pattern như Streak).
 *
 * - /notebooks…   : quản lý nhiều sổ tay + thao tác theo từng sổ tay.
 * - /notebook…    : tổng hợp/tương thích ngược (trạng thái bookmark, sync,
 *                   ghi chú) — gộp xuyên mọi sổ tay.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/dictionary")
@PreAuthorize("isAuthenticated()")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "Notebook", description = "Sổ tay từ vựng & kanji của người dùng hiện hành (đa sổ tay)")
public class NotebookController {

    NotebookService notebookService;

    // ══════════════════════════════════════════════════════════════════
    // Quản lý nhiều sổ tay
    // ══════════════════════════════════════════════════════════════════

    @GetMapping("/notebooks")
    @Operation(summary = "Danh sách sổ tay của user (kèm số mục đã lưu)")
    public ResponseEntity<List<NotebookSummary>> listNotebooks(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(notebookService.listNotebooks(principal.getId()));
    }

    @PostMapping("/notebooks")
    @Operation(summary = "Tạo một sổ tay mới")
    public ResponseEntity<NotebookSummary> createNotebook(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody NotebookSaveRequest request) {
        return ResponseEntity.ok(notebookService.createNotebook(
                principal.getId(), request.getName(), request.getColor()));
    }

    @PutMapping("/notebooks/{notebookId}")
    @Operation(summary = "Đổi tên / màu một sổ tay")
    public ResponseEntity<NotebookSummary> updateNotebook(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long notebookId,
            @Valid @RequestBody NotebookSaveRequest request) {
        return ResponseEntity.ok(notebookService.updateNotebook(
                principal.getId(), notebookId, request.getName(), request.getColor()));
    }

    @DeleteMapping("/notebooks/{notebookId}")
    @Operation(summary = "Xóa một sổ tay (không xóa được sổ tay mặc định)")
    public ResponseEntity<Void> deleteNotebook(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long notebookId) {
        notebookService.deleteNotebook(principal.getId(), notebookId);
        return ResponseEntity.noContent().build();
    }

    // ══════════════════════════════════════════════════════════════════
    // Mục trong một sổ tay cụ thể
    // ══════════════════════════════════════════════════════════════════

    @GetMapping("/notebooks/{notebookId}/entries")
    @Operation(summary = "Lấy các mục (từ + kanji) của một sổ tay")
    public ResponseEntity<NotebookResponse> getNotebookEntries(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long notebookId) {
        return ResponseEntity.ok(notebookService.getNotebookEntries(principal.getId(), notebookId));
    }

    @PostMapping("/notebooks/{notebookId}/words/{wordId}")
    @Operation(summary = "Thêm một từ vào sổ tay (idempotent)")
    public ResponseEntity<NotebookResponse.WordEntry> addWord(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long notebookId,
            @PathVariable Long wordId) {
        return ResponseEntity.ok(retryOnDeadlock(() ->
                notebookService.addWord(principal.getId(), notebookId, wordId)));
    }

    @DeleteMapping("/notebooks/{notebookId}/words/{wordId}")
    @Operation(summary = "Bỏ một từ khỏi sổ tay")
    public ResponseEntity<Void> removeWord(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long notebookId,
            @PathVariable Long wordId) {
        notebookService.removeWord(principal.getId(), notebookId, wordId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/notebooks/{notebookId}/kanjis/{character}")
    @Operation(summary = "Thêm một kanji vào sổ tay (idempotent)")
    public ResponseEntity<NotebookResponse.KanjiEntry> addKanji(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long notebookId,
            @PathVariable String character) {
        return ResponseEntity.ok(retryOnDeadlock(() ->
                notebookService.addKanji(principal.getId(), notebookId, character)));
    }

    @DeleteMapping("/notebooks/{notebookId}/kanjis/{character}")
    @Operation(summary = "Bỏ một kanji khỏi sổ tay")
    public ResponseEntity<Void> removeKanji(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long notebookId,
            @PathVariable String character) {
        notebookService.removeKanji(principal.getId(), notebookId, character);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/notebooks/membership/word/{wordId}")
    @Operation(summary = "Id các sổ tay đang chứa một từ (cho picker)")
    public ResponseEntity<List<Long>> wordMembership(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long wordId) {
        return ResponseEntity.ok(notebookService.notebookIdsForWord(principal.getId(), wordId));
    }

    @GetMapping("/notebooks/membership/kanji/{character}")
    @Operation(summary = "Id các sổ tay đang chứa một kanji (cho picker)")
    public ResponseEntity<List<Long>> kanjiMembership(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String character) {
        return ResponseEntity.ok(notebookService.notebookIdsForKanji(principal.getId(), character));
    }

    // ══════════════════════════════════════════════════════════════════
    // Tổng hợp / tương thích ngược (xuyên mọi sổ tay)
    // ══════════════════════════════════════════════════════════════════

    @GetMapping("/notebook")
    @Operation(summary = "Toàn bộ mục đã lưu (gộp mọi sổ tay, loại trùng) — cho trạng thái bookmark")
    public ResponseEntity<NotebookResponse> getNotebook(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(notebookService.getNotebook(principal.getId()));
    }

    @PostMapping("/notebook/words/{wordId}")
    @Operation(summary = "Lưu nhanh một từ vào sổ tay mặc định (idempotent)")
    public ResponseEntity<NotebookResponse.WordEntry> saveWord(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long wordId) {
        return ResponseEntity.ok(retryOnDeadlock(() ->
                notebookService.saveWordToDefault(principal.getId(), wordId)));
    }

    @DeleteMapping("/notebook/words/{wordId}")
    @Operation(summary = "Bỏ lưu một từ khỏi MỌI sổ tay")
    public ResponseEntity<Void> removeWordEverywhere(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long wordId) {
        notebookService.removeWordEverywhere(principal.getId(), wordId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/notebook/kanjis/{character}")
    @Operation(summary = "Lưu nhanh một kanji vào sổ tay mặc định (idempotent)")
    public ResponseEntity<NotebookResponse.KanjiEntry> saveKanji(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String character) {
        return ResponseEntity.ok(retryOnDeadlock(() ->
                notebookService.saveKanjiToDefault(principal.getId(), character)));
    }

    @DeleteMapping("/notebook/kanjis/{character}")
    @Operation(summary = "Bỏ lưu một kanji khỏi MỌI sổ tay")
    public ResponseEntity<Void> removeKanjiEverywhere(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String character) {
        notebookService.removeKanjiEverywhere(principal.getId(), character);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/notebook/entries/{entryId}/note")
    @Operation(summary = "Cập nhật ghi chú cá nhân cho một mục")
    public ResponseEntity<Void> updateNote(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long entryId,
            @Valid @RequestBody NotebookNoteRequest request) {
        notebookService.updateNote(principal.getId(), entryId, request.getNote());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/notebook")
    @Operation(summary = "Xóa toàn bộ mục đã lưu (giữ lại các sổ tay)")
    public ResponseEntity<Void> clearAll(
            @AuthenticationPrincipal UserPrincipal principal) {
        notebookService.clearAll(principal.getId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/notebook/sync")
    @Operation(summary = "Merge các mục lưu offline (localStorage) vào sổ tay mặc định")
    public ResponseEntity<NotebookResponse> sync(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody NotebookSyncRequest request) {
        return ResponseEntity.ok(retryOnDeadlock(() ->
                notebookService.sync(principal.getId(), request)));
    }

    /**
     * Hai request ghi song song cho cùng user có thể deadlock trên unique index
     * — InnoDB rollback transaction thua cuộc. Retry phải đứng NGOÀI
     * @Transactional (ở tầng controller) để mỗi lần thử chạy trên transaction
     * mới; lần thử lại thấy dòng đã insert và bỏ qua (các thao tác idempotent).
     */
    private static <T> T retryOnDeadlock(Supplier<T> action) {
        final int maxRetries = 2;
        for (int attempt = 0; ; attempt++) {
            try {
                return action.get();
            } catch (PessimisticLockingFailureException e) {
                if (attempt >= maxRetries) throw e;
                try {
                    Thread.sleep(50L * (attempt + 1));
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw e;
                }
            }
        }
    }
}
