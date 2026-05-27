package com.example.starter_project_2025.system.demo;

import com.example.starter_project_2025.base.crud.dto.BaseFilter;
import com.example.starter_project_2025.base.crud.service.BaseCrudServiceImpl;
import com.example.starter_project_2025.base.crud.validation.ValidationContext;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;

/**
 * Only the business-rule hooks. The base looks up repository/mapper/searchable
 * fields automatically from the application context + the entity's
 * {@code @Searchable(fields)} annotation.
 */
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class BookServiceImpl
        extends BaseCrudServiceImpl<Book, Long, BookDTO, BaseFilter> {

    BookRepository bookRepository;

    @Override
    protected void beforeCreate(Book book, BookDTO request, ValidationContext ctx) {
        if (bookRepository.existsByName(request.getName())) {
            ctx.add("name", "Book name already exists");
        }
    }

    @Override
    protected void beforeUpdate(Book book, BookDTO request, ValidationContext ctx) {
        if (request.getName() != null
                && !request.getName().equals(book.getName())
                && bookRepository.existsByName(request.getName())) {
            ctx.add("name", "Book name already exists");
        }
    }
}
