package com.example.starter_project_2025.domain.assessment.question;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QuestionBankRepository extends BaseCrudRepository<QuestionBank, Long> {

    /** Questions carrying a specific tag. */
    @Query("select distinct q from QuestionBank q join q.tags t "
            + "where t.id = :tagId and q.isDeleted = false")
    List<QuestionBank> findByTagsId(@Param("tagId") Long tagId);

    /** Questions carrying AT LEAST ONE of the given tags (OR). */
    @Query("select distinct q from QuestionBank q join q.tags t "
            + "where t.id in :tagIds and q.isDeleted = false")
    List<QuestionBank> findByAnyTagIds(@Param("tagIds") List<Long> tagIds);

    /** Questions carrying ALL of the given tags (AND). {@code count} must equal
     *  the number of distinct tag IDs requested. */
    @Query("select q from QuestionBank q join q.tags t "
            + "where t.id in :tagIds and q.isDeleted = false "
            + "group by q having count(distinct t.id) = :count")
    List<QuestionBank> findByAllTagIds(@Param("tagIds") List<Long> tagIds, @Param("count") long count);
}
