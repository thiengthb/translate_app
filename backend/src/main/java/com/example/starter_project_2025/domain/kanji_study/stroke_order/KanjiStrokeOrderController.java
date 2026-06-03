package com.example.starter_project_2025.domain.kanji_study.stroke_order;

import com.example.starter_project_2025.base.crud.dto.OnCreate;
import com.example.starter_project_2025.base.crud.dto.OnUpdate;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/kanji-stroke-orders")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "Kanji Stroke Order", description = "APIs for kanji stroke-order animation data")
public class KanjiStrokeOrderController {

    KanjiStrokeOrderService kanjiStrokeOrderService;

    @GetMapping
    @PreAuthorize("hasAuthority('KANJI_STROKE_ORDER_READ')")
    public ResponseEntity<Page<KanjiStrokeOrderDTO>> getAll(
            @PageableDefault Pageable pageable,
            @RequestParam(required = false) String search,
            @ModelAttribute KanjiStrokeOrderFilter filter) {
        return ResponseEntity.ok(kanjiStrokeOrderService.getAll(pageable, search, filter));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('KANJI_STROKE_ORDER_READ')")
    public ResponseEntity<KanjiStrokeOrderDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(kanjiStrokeOrderService.getById(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('KANJI_STROKE_ORDER_CREATE')")
    public ResponseEntity<KanjiStrokeOrderDTO> create(@Validated(OnCreate.class) @RequestBody KanjiStrokeOrderDTO request) {
        return ResponseEntity.ok(kanjiStrokeOrderService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('KANJI_STROKE_ORDER_UPDATE')")
    public ResponseEntity<KanjiStrokeOrderDTO> update(@PathVariable Long id,
            @Validated(OnUpdate.class) @RequestBody KanjiStrokeOrderDTO request) {
        return ResponseEntity.ok(kanjiStrokeOrderService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('KANJI_STROKE_ORDER_DELETE')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        kanjiStrokeOrderService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
