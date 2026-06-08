package com.example.starter_project_2025.system.words.word;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WordRepository extends BaseCrudRepository<Word, Long> {

    boolean existsByWordAndIsDeletedFalse(String word);

    /** Active words for a JLPT level, looked up by the level's code (e.g. "N5"). */
    @Query("select w from Word w where w.isDeleted = false and w.level.code = :code")
    List<Word> findByLevelCode(@Param("code") String code);
    /**
     * Dùng cho import: phát hiện từ đã tồn tại (tránh nhập trùng).
     * Khoá trùng = (word + reading). Reading null được so khớp với reading null.
     * Bỏ qua các bản ghi đã xoá mềm.
     */
    @Query("""
            select case when count(w) > 0 then true else false end
            from Word w
            where w.word = :word
              and ((:reading is null and w.reading is null) or w.reading = :reading)
              and w.isDeleted = false
            """)
    boolean existsByWordAndReading(@Param("word") String word, @Param("reading") String reading);

    /**
     * Dùng cho import file lớn: nạp toàn bộ khoá (word + reading) MỘT lần để
     * kiểm tra trùng in-memory, thay vì {@link #existsByWordAndReading} từng dòng
     * (15k dòng = 15k SELECT).
     */
    @Query("select w.word, w.reading from Word w where w.isDeleted = false")
    java.util.List<Object[]> findAllWordReadingPairs();
}