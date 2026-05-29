package com.example.starter_project_2025.base.crud.service;

import com.example.starter_project_2025.base.crud.dto.BaseDTO;
import com.example.starter_project_2025.base.crud.dto.BaseFilter;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Collection;

public interface BaseCrudService<
        I,
        D extends BaseDTO,
        F extends BaseFilter> {

    Page<D> getAll(Pageable pageable, String search, F filter);

    D getById(I id);

    D create(D request);

    D update(I id, D request);

    void delete(I id);

    default void deleteAll(Collection<I> ids) {
        if (ids == null) return;
        for (I id : ids) {
            delete(id);
        }
    }
}
