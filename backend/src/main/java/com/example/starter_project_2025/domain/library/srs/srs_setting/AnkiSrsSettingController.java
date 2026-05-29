package com.example.starter_project_2025.domain.library.srs.srs_setting;

import com.example.starter_project_2025.domain.library.srs.algorithm_config.SrsAlgorithmConfig;
import com.example.starter_project_2025.domain.library.srs.algorithm_config.SrsAlgorithmConfigRepository;
import com.example.starter_project_2025.security.UserPrincipal;
import com.example.starter_project_2025.system.rbac.user.User;
import com.example.starter_project_2025.system.rbac.user.UserRepository;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/anki/settings")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "AnkiSrsSetting", description = "APIs for managing per-user Anki SRS settings")
public class AnkiSrsSettingController {
    AnkiSrsSettingRepository ankiSrsSettingRepository;
    AnkiSrsSettingMapper ankiSrsSettingMapper;
    UserRepository userRepository;
    SrsAlgorithmConfigRepository algorithmConfigRepository;

    @GetMapping("/mine")
    @PreAuthorize("hasAuthority('ANKI_SRS_SETTING_READ')")
    @Transactional(readOnly = true)
    public ResponseEntity<AnkiSrsSettingDTO> getMine(@AuthenticationPrincipal UserPrincipal principal) {
        return ankiSrsSettingRepository.findByUserId(principal.getId())
                .map(ankiSrsSettingMapper::toResponse)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.<AnkiSrsSettingDTO>ok(null));
    }

    @PutMapping("/mine")
    @PreAuthorize("hasAuthority('ANKI_SRS_SETTING_UPDATE') or hasAuthority('ANKI_SRS_SETTING_CREATE')")
    @Transactional
    public AnkiSrsSettingDTO saveMine(
            @RequestBody AnkiSrsSettingsRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Long userId = principal.getId();
        User user = userRepository.findById(userId).orElseThrow();

        SrsAlgorithmConfig algorithmConfig = resolveAlgorithmConfig(userId, request);

        AnkiSrsSetting setting = ankiSrsSettingRepository.findByUserId(userId)
                .orElseGet(() -> {
                    AnkiSrsSetting s = new AnkiSrsSetting();
                    s.setUser(user);
                    s.setIsActive(true);
                    return s;
                });

        setting.setAlgorithmConfig(algorithmConfig);
        setting.setTargetRetention(request.getTargetRetention() != null ? request.getTargetRetention() : 0.9);
        setting.setMaxReviewsPerDay(request.getMaxReviewsPerDay() != null ? request.getMaxReviewsPerDay() : 100);
        setting.setMaxItemsPerDay(request.getMaxItemsPerDay() != null ? request.getMaxItemsPerDay() : 20);
        setting.setBuryRelatedItems(request.getBuryRelatedItems() != null ? request.getBuryRelatedItems() : true);

        return ankiSrsSettingMapper.toResponse(ankiSrsSettingRepository.save(setting));
    }

    private SrsAlgorithmConfig resolveAlgorithmConfig(Long userId, AnkiSrsSettingsRequest request) {
        if (request.getAlgorithmConfigJson() != null && !request.getAlgorithmConfigJson().isBlank()) {
            String code = "USER_SM2_" + userId;
            SrsAlgorithmConfig config = algorithmConfigRepository.findByCode(code)
                    .orElseGet(SrsAlgorithmConfig::new);

            config.setCode(code);
            config.setName("My SM2 Options");
            config.setAlgorithmType("SM2");
            config.setConfigJson(request.getAlgorithmConfigJson());
            config.setEnabled(true);
            config.setIsActive(true);

            return algorithmConfigRepository.save(config);
        }

        if (request.getAlgorithmConfigId() != null && request.getAlgorithmConfigId() > 0) {
            return algorithmConfigRepository.findById(request.getAlgorithmConfigId()).orElse(null);
        }

        return null;
    }
}
