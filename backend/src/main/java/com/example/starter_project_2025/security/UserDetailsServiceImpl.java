package com.example.starter_project_2025.security;

import com.example.starter_project_2025.base.event.EntityEvent;
import com.example.starter_project_2025.system.rbac.user.User;
import com.example.starter_project_2025.system.rbac.user.UserRepository;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.context.event.EventListener;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;

/**
 * Caches the resolved {@link UserPrincipal} for 30 s to avoid hitting the DB
 * (users + user_roles + role_permissions) on every authenticated request.
 *
 * Cache is invalidated wholesale on:
 *  - any User entity event (CREATE / UPDATE / DELETE) published by BaseCrudServiceImpl
 *  - any Role / Permission change — they alter every user's derived authorities
 */
@Service
public class UserDetailsServiceImpl implements UserDetailsService {

    private static final Duration TTL = Duration.ofSeconds(30);
    private static final int MAX_SIZE = 5_000;

    private final UserRepository userRepository;
    private final Cache<String, UserDetails> cache = Caffeine.newBuilder()
            .expireAfterWrite(TTL)
            .maximumSize(MAX_SIZE)
            .build();

    public UserDetailsServiceImpl(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        UserDetails cached = cache.getIfPresent(email);
        if (cached != null) return cached;

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        UserPrincipal fresh = UserPrincipal.fromUser(user);
        cache.put(email, fresh);
        return fresh;
    }

    @EventListener
    public void onEntityChanged(EntityEvent<?> event) {
        String simpleName = event.getEntityName();
        if ("User".equals(simpleName)
                || "Role".equals(simpleName)
                || "Permission".equals(simpleName)) {
            cache.invalidateAll();
        }
    }
}
