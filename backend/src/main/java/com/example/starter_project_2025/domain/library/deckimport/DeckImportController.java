package com.example.starter_project_2025.domain.library.deckimport;

import com.example.starter_project_2025.domain.library.deckimport.DeckImportDtos.ConfirmRequest;
import com.example.starter_project_2025.domain.library.deckimport.DeckImportDtos.DelimiterOption;
import com.example.starter_project_2025.domain.library.deckimport.DeckImportDtos.DuplicateStrategy;
import com.example.starter_project_2025.domain.library.deckimport.DeckImportDtos.ImportResultResponse;
import com.example.starter_project_2025.domain.library.deckimport.DeckImportDtos.PreviewResponse;
import com.example.starter_project_2025.security.PermissionChecker;
import com.example.starter_project_2025.security.UserPrincipal;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;

@RestController
@RequiredArgsConstructor
@RequestMapping({"/api/import", "/api/deck-import"})
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "Deck Import", description = "Preview and import deck flashcards")
public class DeckImportController {

    DeckImportService deckImportService;

    @PostMapping(value = "/preview", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<PreviewResponse> preview(
            @RequestPart("file") MultipartFile file,
            @RequestParam(required = false, defaultValue = "AUTO") DelimiterOption delimiter,
            @RequestParam(required = false) Boolean header,
            @RequestParam(required = false) Integer previewPage,
            @RequestParam(required = false) Integer previewRows,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        requireAuthenticated(principal);
        PermissionChecker.require("DECK_CREATE");
        PermissionChecker.require("FLASHCARD_CREATE");
        return ResponseEntity.ok(deckImportService.preview(file, delimiter, header, previewPage, previewRows, principal.getId()));
    }

    @PostMapping("/confirm")
    public ResponseEntity<ImportResultResponse> confirm(
            @RequestBody ConfirmRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        requireAuthenticated(principal);
        PermissionChecker.require("DECK_CREATE");
        PermissionChecker.require("FLASHCARD_CREATE");
        PermissionChecker.require("DECK_ITEM_CREATE");
        if (request != null && request.getDeckId() != null) {
            PermissionChecker.require("DECK_UPDATE");
        }
        if (request != null && request.getDuplicateStrategy() == DuplicateStrategy.UPDATE) {
            PermissionChecker.require("FLASHCARD_UPDATE");
        }
        return ResponseEntity.ok(deckImportService.confirm(request, principal.getId()));
    }

    @GetMapping("/batches/{batchId}")
    public ResponseEntity<ImportResultResponse> getBatch(
            @PathVariable Long batchId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        requireAuthenticated(principal);
        PermissionChecker.require("DECK_READ");
        return ResponseEntity.ok(deckImportService.getBatch(batchId, principal.getId()));
    }

    @GetMapping("/deck-template")
    public ResponseEntity<ByteArrayResource> template() {
        PermissionChecker.require("DECK_CREATE");
        String csv = "front,reading,meaning,example,tags\n"
                + "\"taberu\",\"taberu\",\"to eat\",\"I eat rice.\",\"verbs; n5\"\n";
        ByteArrayResource resource = new ByteArrayResource(csv.getBytes(StandardCharsets.UTF_8));
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=deck-import-template.csv")
                .contentType(MediaType.parseMediaType("text/csv"))
                .contentLength(resource.contentLength())
                .body(resource);
    }

    private void requireAuthenticated(UserPrincipal principal) {
        if (principal == null || principal.getId() == null) {
            throw new AccessDeniedException("Unauthorized");
        }
    }
}
