package com.example.starter_project_2025.base.tenant;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TenantRepository extends JpaRepository<Tenant, Long> {

    Optional<Tenant> findBySlug(String slug);

    Optional<Tenant> findByDomain(String domain);

    boolean existsByName(String name);
}
