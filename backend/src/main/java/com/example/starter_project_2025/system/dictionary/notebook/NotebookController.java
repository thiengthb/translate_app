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

import java.util.function.Supplier;

/**
 * Sổ tay từ vựng/kanji của user hiện hành. Mọi endpoint đều yêu cầu đăng nhập
 * và chỉ thao tác trên dữ liệu của chính principal — không có endpoint nào
 * nhận userId từ client (cùng pattern với StreakController).
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/dictionary/notebook")
@PreAuthorize("isAuthenticated()")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "Notebook", description = "Sổ tay từ vựng & kanji đã lưu của người dùng hiện hành")
public class NotebookController {

    NotebookService notebookService;

    @GetMapping
    @Operation(summary = "Lấy toàn bộ sổ tay (từ vựng + kanji đã lưu, kèm ghi chú)")
    public ResponseEntity<NotebookResponse> getNotebook(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(notebookService.getNotebook(principal.getId()));
    }

    @PostMapping("/words/{wordId}")
    @Operation(summary = "Lưu một từ vào sổ tay (idempotent)")
    public ResponseEntity<NotebookResponse.WordEntry> saveWord(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long wordId) {
        return ResponseEntity.ok(retryOnDeadlock(() ->
                notebookService.saveWord(principal.getId(), wordId)));
    }

    @DeleteMapping("/words/{wordId}")
    @Operation(summary = "Bỏ lưu một từ khỏi sổ tay")
    public ResponseEntity<Void> removeWord(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long wordId) {
        notebookService.removeWord(principal.getId(), wordId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/kanjis/{character}")
    @Operation(summary = "Lưu một kanji vào sổ tay (idempotent)")
    public ResponseEntity<NotebookResponse.KanjiEntry> saveKanji(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String character) {
        return ResponseEntity.ok(retryOnDeadlock(() ->
                notebookService.saveKanji(principal.getId(), character)));
    }

    @DeleteMapping("/kanjis/{character}")
    @Operation(summary = "Bỏ lưu một kanji khỏi sổ tay")
    public ResponseEntity<Void> removeKanji(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String character) {
        notebookService.removeKanji(principal.getId(), character);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/entries/{entryId}/note")
    @Operation(summary = "Cập nhật ghi chú cá nhân cho một mục trong sổ tay")
    public ResponseEntity<Void> updateNote(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long entryId,
            @Valid @RequestBody NotebookNoteRequest request) {
        notebookService.updateNote(principal.getId(), entryId, request.getNote());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping
    @Operation(summary = "Xóa toàn bộ sổ tay của user hiện hành")
    public ResponseEntity<Void> clearAll(
            @AuthenticationPrincipal UserPrincipal principal) {
        notebookService.clearAll(principal.getId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/sync")
    @Operation(summary = "Merge các mục lưu offline (localStorage) vào sổ tay trên server, trả về sổ tay đầy đủ")
    public ResponseEntity<NotebookResponse> sync(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody NotebookSyncRequest request) {
        return ResponseEntity.ok(retryOnDeadlock(() ->
                notebookService.sync(principal.getId(), request)));
    }

    /**
     * Hai request ghi song song cho cùng user (vd 2 tab cùng gọi /sync) có thể
     * deadlock trên unique index (user_id, word_id) — InnoDB rollback toàn bộ
     * transaction thua cuộc. Retry phải đứng NGOÀI @Transactional (ở đây, tầng
     * controller) để mỗi lần thử chạy trên một transaction mới; lần thử lại sẽ
     * thấy các dòng transaction thắng đã insert và bỏ qua (các thao tác đều
     * idempotent).
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