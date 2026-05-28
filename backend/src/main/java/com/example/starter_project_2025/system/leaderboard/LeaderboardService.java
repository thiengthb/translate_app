package com.example.starter_project_2025.system.leaderboard;

import com.example.starter_project_2025.system.leaderboard.dto.LeaderboardEntry;
import com.example.starter_project_2025.system.leaderboard.dto.PublicProfileResponse;

import java.util.List;

public interface LeaderboardService {

    List<LeaderboardEntry> getLeaderboard(int limit, String sortBy);

    PublicProfileResponse getPublicProfile(Long userId);
}
