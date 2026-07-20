package com.example.starter_project_2025.system.reading.passage;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import org.springframework.stereotype.Repository;

/**
 * Custom query method ({@code existsByTitle}) là lý do file repository này tồn
 * tại — phục vụ seed idempotent ở {@code ReadingPassageDataInitializer}. Khi đã
 * khai báo, {@code AutoCrudBeanRegistrar} dùng interface này thay vì sinh
 * interface runtime qua ByteBuddy.
 */
@Repository
public interface ReadingPassageRepository extends BaseCrudRepository<ReadingPassage, Long> {

    boolean existsByTitle(String title);
}