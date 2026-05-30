package com.example.starter_project_2025.init;

import com.example.starter_project_2025.domain.assessment.question.QuestionBank;
import com.example.starter_project_2025.domain.assessment.question.QuestionBankRepository;
import com.example.starter_project_2025.domain.assessment.question.QuestionOption;
import com.example.starter_project_2025.domain.assessment.quiz.Quiz;
import com.example.starter_project_2025.domain.assessment.quiz.QuizRepository;
import com.example.starter_project_2025.domain.assessment.quiz_question.QuizQuestion;
import com.example.starter_project_2025.domain.assessment.quiz_question.QuizQuestionRepository;
import com.example.starter_project_2025.domain.assessment.tag.QuestionTag;
import com.example.starter_project_2025.domain.assessment.tag.QuestionTagRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * Seeds a self-contained assessment sample with no owner ("nobody"):
 *   • 5 system question tags (createdByUser = null)
 *   • 50 system questions (createdByUser = null, isSystemGenerated = true), each tagged
 *   • 1 ownerless PUBLIC/PUBLISHED quiz (creatorId = null) holding all 50 questions
 *
 * Idempotent — gated on the seed quiz's unique code, so re-boots skip it.
 */
@Slf4j
@Order(13)
@Component
@RequiredArgsConstructor
public class SeedAssessmentInitializer implements CommandLineRunner {

    private static final String SEED_QUIZ_CODE = "SEED-N5-MIXED-50";
    private static final int QUESTION_COUNT = 50;

    private final QuestionTagRepository questionTagRepository;
    private final QuestionBankRepository questionBankRepository;
    private final QuizRepository quizRepository;
    private final QuizQuestionRepository quizQuestionRepository;

    @Override
    @Transactional
    public void run(String... args) {
        if (quizRepository.existsByCode(SEED_QUIZ_CODE)) {
            log.info("Assessment seed skipped — quiz {} already exists.", SEED_QUIZ_CODE);
            return;
        }

        // ── 5 system tags (reused if a code already exists) ──
        QuestionTag tagN5 = ensureTag("N5", "n5");
        QuestionTag tagVocab = ensureTag("Vocabulary", "vocabulary");
        QuestionTag tagKanji = ensureTag("Kanji", "kanji");
        QuestionTag tagGrammar = ensureTag("Grammar", "grammar");
        QuestionTag tagReading = ensureTag("Reading", "reading");

        // ── The ownerless quiz (created first so we can link questions to it) ──
        Quiz quiz = quizRepository.save(Quiz.builder()
                .creatorId(null)                       // nobody owns it
                .code(SEED_QUIZ_CODE)
                .title("JLPT N5 · Mixed Practice (50)")
                .description("Auto-generated sample quiz: 50 mixed N5 vocabulary questions. Owned by nobody.")
                .difficultyLevel("N5")
                .timeLimitMinutes(30)
                .allowRetake(true)
                .isRandomQuestion(false)
                .showAnswerAfterSubmit(true)
                .showExplanationAfterSubmit(true)
                .visibility("PUBLIC")
                .status("PUBLISHED")
                .publishedAt(LocalDateTime.now())
                .build());

        // ── 50 questions + their placement in the quiz ──
        int size = POOL.size();
        double totalScore = 0;
        for (int i = 0; i < QUESTION_COUNT; i++) {
            Vocab entry = POOL.get(i % size);
            QType type = QTYPES[i % QTYPES.length];

            QuestionBank question = buildQuestion(i, entry, type, size,
                    tagN5, tagVocab, tagKanji, tagGrammar, tagReading);
            QuestionBank saved = questionBankRepository.save(question);

            quizQuestionRepository.save(QuizQuestion.builder()
                    .quizId(quiz.getId())
                    .questionId(saved.getId())
                    .orderIndex(i)
                    .score(1)
                    .isRequired(true)
                    .build());
            totalScore += 1;
        }

        quiz.setTotalQuestions(QUESTION_COUNT);
        quiz.setTotalScore(totalScore);
        quiz.setPassScore(Math.ceil(totalScore * 0.6)); // 60% to pass
        quizRepository.save(quiz);

        log.info("Assessment seed: created quiz {} with {} questions and 5 tags (no owner).",
                SEED_QUIZ_CODE, QUESTION_COUNT);
    }

    /* ─────────────────────────────────────────
       Tag helper — find by code or create a system tag
    ───────────────────────────────────────── */
    private QuestionTag ensureTag(String name, String code) {
        return questionTagRepository.findByCodeAndCreatedByUserIsNull(code)
                .orElseGet(() -> questionTagRepository.save(
                        QuestionTag.builder()
                                .name(name)
                                .code(code)
                                .description("System tag")
                                .createdByUser(null) // system tag
                                .build()));
    }

    /* ─────────────────────────────────────────
       Question builder — one per (entry, type)
    ───────────────────────────────────────── */
    private QuestionBank buildQuestion(int i, Vocab e, QType type, int size,
                                       QuestionTag n5, QuestionTag vocab, QuestionTag kanji,
                                       QuestionTag grammar, QuestionTag reading) {
        Vocab d1 = POOL.get((i + 1) % size);
        Vocab d2 = POOL.get((i + 2) % size);
        Vocab d3 = POOL.get((i + 3) % size);

        String prompt;
        String explanation;
        List<OptSpec> specs = new ArrayList<>();
        Set<QuestionTag> tags = new LinkedHashSet<>();
        tags.add(n5);
        tags.add(kanji); // every pool word uses kanji

        String questionType;
        switch (type) {
            case SINGLE_WORD -> {
                questionType = "SINGLE_CHOICE";
                prompt = "Which word means \"" + e.meaning + "\"?";
                explanation = e.word + " (" + e.reading + ") = " + e.meaning;
                specs.add(new OptSpec(e.word, true));
                specs.add(new OptSpec(d1.word, false));
                specs.add(new OptSpec(d2.word, false));
                specs.add(new OptSpec(d3.word, false));
                tags.add(vocab);
            }
            case TRUE_FALSE -> {
                questionType = "TRUE_FALSE";
                boolean statementTrue = (i % 2 == 0);
                String shownMeaning = statementTrue ? e.meaning : d1.meaning;
                prompt = "「" + e.word + "」(" + e.reading + ") means \"" + shownMeaning + "\".";
                explanation = e.word + " actually means \"" + e.meaning + "\".";
                specs.add(new OptSpec("True", statementTrue));
                specs.add(new OptSpec("False", !statementTrue));
                tags.add(grammar);
            }
            case FILL_BLANK -> {
                questionType = "FILL_BLANK";
                prompt = "Type the hiragana reading of 「" + e.word + "」.";
                explanation = e.word + " is read 「" + e.reading + "」.";
                specs.add(new OptSpec(e.reading, true)); // accepted answer
                tags.add(reading);
            }
            case MULTI -> {
                questionType = "MULTIPLE_CHOICE";
                prompt = "「" + e.word + "」 — select ALL correct statements.";
                explanation = e.word + " (" + e.reading + ") = " + e.meaning;
                specs.add(new OptSpec("Means \"" + e.meaning + "\"", true));
                specs.add(new OptSpec("Is read 「" + e.reading + "」", true));
                specs.add(new OptSpec("Means \"" + d1.meaning + "\"", false));
                specs.add(new OptSpec("Is read 「" + d2.reading + "」", false));
                tags.add(vocab);
            }
            default -> { // SINGLE_MEANING
                questionType = "SINGLE_CHOICE";
                prompt = "What does 「" + e.word + "」(" + e.reading + ") mean?";
                explanation = e.word + " (" + e.reading + ") = " + e.meaning;
                specs.add(new OptSpec(e.meaning, true));
                specs.add(new OptSpec(d1.meaning, false));
                specs.add(new OptSpec(d2.meaning, false));
                specs.add(new OptSpec(d3.meaning, false));
                tags.add(vocab);
            }
        }

        // Vary the position of the correct option so it isn't always first
        // (True/False keeps its conventional order).
        if (type != QType.TRUE_FALSE && specs.size() > 1) {
            Collections.rotate(specs, i % specs.size());
        }

        QuestionBank question = QuestionBank.builder()
                .questionType(questionType)
                .prompt(prompt)
                .explanation(explanation)
                .difficultyLevel("N5")
                .defaultScore(1)
                .createdByUser(null)        // nobody
                .isSystemGenerated(true)
                .options(new ArrayList<>())
                .tags(tags)
                .build();

        int order = 0;
        for (OptSpec spec : specs) {
            question.getOptions().add(QuestionOption.builder()
                    .question(question)
                    .content(spec.content())
                    .isCorrect(spec.correct())
                    .orderIndex(order++)
                    .build());
        }
        return question;
    }

    /* ─────────────────────────────────────────
       Static data
    ───────────────────────────────────────── */
    private enum QType { SINGLE_MEANING, SINGLE_WORD, TRUE_FALSE, FILL_BLANK, MULTI }

    private static final QType[] QTYPES = QType.values();

    private record Vocab(String word, String reading, String meaning) {}

    private record OptSpec(String content, boolean correct) {}

    private static final List<Vocab> POOL = List.of(
            new Vocab("食べる", "たべる", "to eat"),
            new Vocab("飲む", "のむ", "to drink"),
            new Vocab("行く", "いく", "to go"),
            new Vocab("見る", "みる", "to see"),
            new Vocab("聞く", "きく", "to listen"),
            new Vocab("大きい", "おおきい", "big"),
            new Vocab("小さい", "ちいさい", "small"),
            new Vocab("新しい", "あたらしい", "new"),
            new Vocab("古い", "ふるい", "old"),
            new Vocab("高い", "たかい", "expensive / tall"),
            new Vocab("学校", "がっこう", "school"),
            new Vocab("先生", "せんせい", "teacher"),
            new Vocab("学生", "がくせい", "student"),
            new Vocab("水", "みず", "water"),
            new Vocab("火", "ひ", "fire"),
            new Vocab("山", "やま", "mountain"),
            new Vocab("川", "かわ", "river"),
            new Vocab("犬", "いぬ", "dog"),
            new Vocab("猫", "ねこ", "cat"),
            new Vocab("本", "ほん", "book")
    );
}
