package com.example.starter_project_2025.system.reward;

import com.example.starter_project_2025.security.UserPrincipal;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/rewards")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class RewardController {

    RewardService rewardService;

    /** Current authenticated user's exp/coins balance and reward history. */
    @GetMapping("/me")
    public ResponseEntity<?> myBalance(Authentication auth) {
        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        return ResponseEntity.ok(rewardService.getBalance(principal.getId()));
    }
}
