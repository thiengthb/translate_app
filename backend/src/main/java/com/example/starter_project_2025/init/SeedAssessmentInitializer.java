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
 * Seeds several self-contained, ownerless sample quizzes ("nobody" owns them):
 *   • shared system question tags (createdByUser = null)
 *   • for each quiz spec: N questions built from its vocab pool, each tagged
 *   • one ownerless PUBLIC/PUBLISHED quiz (creatorId = null) holding those questions
 *
 * Idempotent — each quiz is gated on its unique code, so re-boots skip existing ones
 * and only create quizzes that are missing.
 */
@Slf4j
@Order(13)
@Component
@RequiredArgsConstructor
public class SeedAssessmentInitializer implements CommandLineRunner {

    private final QuestionTagRepository questionTagRepository;
    private final QuestionBankRepository questionBankRepository;
    private final QuizRepository quizRepository;
    private final QuizQuestionRepository quizQuestionRepository;

    @Override
    @Transactional
    public void run(String... args) {
        // Shared system tags
        QuestionTag tagVocab = ensureTag("Vocabulary", "vocabulary");
        QuestionTag tagKanji = ensureTag("Kanji", "kanji");
        QuestionTag tagGrammar = ensureTag("Grammar", "grammar");
        QuestionTag tagReading = ensureTag("Reading", "reading");

        int created = 0;
        for (QuizSpec spec : SEED_QUIZZES) {
            if (quizRepository.existsByCode(spec.code())) continue;
            QuestionTag levelTag = ensureTag(spec.difficulty(), spec.difficulty().toLowerCase());
            createQuiz(spec, levelTag, tagVocab, tagKanji, tagGrammar, tagReading);
            created++;
        }
        log.info("Assessment seed: {} new sample quizzes created (of {} defined).", created, SEED_QUIZZES.size());
    }

    /* ─────────────────────────────────────────
       Build one quiz from a spec
    ───────────────────────────────────────── */
    private void createQuiz(QuizSpec spec, QuestionTag levelTag, QuestionTag vocab,
                            QuestionTag kanji, QuestionTag grammar, QuestionTag reading) {
        Quiz quiz = quizRepository.save(Quiz.builder()
                .creatorId(null)
                .code(spec.code())
                .title(spec.title())
                .description(spec.description())
                .difficultyLevel(spec.difficulty())
                .timeLimitMinutes(spec.timeLimitMinutes())
                .allowRetake(true)
                .isRandomQuestion(false)
                .showAnswerAfterSubmit(true)
                .showExplanationAfterSubmit(true)
                .visibility("PUBLIC")
                .status("PUBLISHED")
                .publishedAt(LocalDateTime.now())
                .build());

        List<Vocab> pool = spec.pool();
        int size = pool.size();
        double totalScore = 0;
        for (int i = 0; i < spec.count(); i++) {
            Vocab entry = pool.get(i % size);
            QType type = QTYPES[i % QTYPES.length];

            QuestionBank question = buildQuestion(i, entry, type, pool, spec.difficulty(),
                    levelTag, vocab, kanji, grammar, reading);
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

        quiz.setTotalQuestions(spec.count());
        quiz.setTotalScore(totalScore);
        quiz.setPassScore(Math.ceil(totalScore * 0.6)); // 60% to pass
        quizRepository.save(quiz);
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
                                .createdByUser(null)
                                .build()));
    }

    /* ─────────────────────────────────────────
       Question builder — one per (entry, type)
    ───────────────────────────────────────── */
    private QuestionBank buildQuestion(int i, Vocab e, QType type, List<Vocab> pool, String level,
                                       QuestionTag levelTag, QuestionTag vocab, QuestionTag kanji,
                                       QuestionTag grammar, QuestionTag reading) {
        int size = pool.size();
        Vocab d1 = pool.get((i + 1) % size);
        Vocab d2 = pool.get((i + 2) % size);
        Vocab d3 = pool.get((i + 3) % size);

        String prompt;
        String explanation;
        List<OptSpec> specs = new ArrayList<>();
        Set<QuestionTag> tags = new LinkedHashSet<>();
        tags.add(levelTag);
        tags.add(kanji);

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
                specs.add(new OptSpec(e.reading, true));
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
            default -> {
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

        if (type != QType.TRUE_FALSE && specs.size() > 1) {
            Collections.rotate(specs, i % specs.size());
        }

        QuestionBank question = QuestionBank.builder()
                .questionType(questionType)
                .prompt(prompt)
                .explanation(explanation)
                .difficultyLevel(level)
                .defaultScore(1)
                .createdByUser(null)
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

    private record QuizSpec(String code, String title, String description, String difficulty,
                            int timeLimitMinutes, int count, List<Vocab> pool) {}

    /* ── Vocab pools ── */
    private static final List<Vocab> POOL_N5_CORE = List.of(
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

    private static final List<Vocab> POOL_N5_VERBS = List.of(
            new Vocab("話す", "はなす", "to speak"),
            new Vocab("読む", "よむ", "to read"),
            new Vocab("書く", "かく", "to write"),
            new Vocab("買う", "かう", "to buy"),
            new Vocab("来る", "くる", "to come"),
            new Vocab("帰る", "かえる", "to return home"),
            new Vocab("起きる", "おきる", "to wake up"),
            new Vocab("寝る", "ねる", "to sleep"),
            new Vocab("働く", "はたらく", "to work"),
            new Vocab("休む", "やすむ", "to rest"),
            new Vocab("待つ", "まつ", "to wait"),
            new Vocab("作る", "つくる", "to make"),
            new Vocab("使う", "つかう", "to use"),
            new Vocab("立つ", "たつ", "to stand"),
            new Vocab("座る", "すわる", "to sit")
    );

    private static final List<Vocab> POOL_N5_ADJ = List.of(
            new Vocab("安い", "やすい", "cheap"),
            new Vocab("暑い", "あつい", "hot (weather)"),
            new Vocab("寒い", "さむい", "cold (weather)"),
            new Vocab("おいしい", "おいしい", "delicious"),
            new Vocab("楽しい", "たのしい", "fun"),
            new Vocab("難しい", "むずかしい", "difficult"),
            new Vocab("易しい", "やさしい", "easy"),
            new Vocab("忙しい", "いそがしい", "busy"),
            new Vocab("早い", "はやい", "early / fast"),
            new Vocab("遅い", "おそい", "late / slow"),
            new Vocab("広い", "ひろい", "spacious"),
            new Vocab("狭い", "せまい", "narrow"),
            new Vocab("長い", "ながい", "long"),
            new Vocab("短い", "みじかい", "short")
    );

    private static final List<Vocab> POOL_DAILY = List.of(
            new Vocab("お茶", "おちゃ", "tea"),
            new Vocab("ご飯", "ごはん", "rice / meal"),
            new Vocab("肉", "にく", "meat"),
            new Vocab("魚", "さかな", "fish"),
            new Vocab("野菜", "やさい", "vegetable"),
            new Vocab("果物", "くだもの", "fruit"),
            new Vocab("お金", "おかね", "money"),
            new Vocab("時間", "じかん", "time"),
            new Vocab("電車", "でんしゃ", "train"),
            new Vocab("車", "くるま", "car"),
            new Vocab("家", "いえ", "house"),
            new Vocab("部屋", "へや", "room"),
            new Vocab("店", "みせ", "shop"),
            new Vocab("道", "みち", "road")
    );

    private static final List<Vocab> POOL_N4 = List.of(
            new Vocab("経験", "けいけん", "experience"),
            new Vocab("技術", "ぎじゅつ", "technology / skill"),
            new Vocab("説明", "せつめい", "explanation"),
            new Vocab("相談", "そうだん", "consultation"),
            new Vocab("準備", "じゅんび", "preparation"),
            new Vocab("連絡", "れんらく", "contact"),
            new Vocab("予定", "よてい", "plan / schedule"),
            new Vocab("約束", "やくそく", "promise"),
            new Vocab("原因", "げんいん", "cause"),
            new Vocab("結果", "けっか", "result"),
            new Vocab("方法", "ほうほう", "method"),
            new Vocab("関係", "かんけい", "relationship"),
            new Vocab("意見", "いけん", "opinion"),
            new Vocab("理由", "りゆう", "reason")
    );

    private static final List<Vocab> SEED_QUIZZES_POOL_TIME = List.of(
            new Vocab("今日", "きょう", "today"),
            new Vocab("明日", "あした", "tomorrow"),
            new Vocab("昨日", "きのう", "yesterday"),
            new Vocab("朝", "あさ", "morning"),
            new Vocab("昼", "ひる", "noon"),
            new Vocab("夜", "よる", "night"),
            new Vocab("毎日", "まいにち", "every day"),
            new Vocab("週", "しゅう", "week"),
            new Vocab("月", "つき", "month / moon"),
            new Vocab("年", "とし", "year"),
            new Vocab("午前", "ごぜん", "morning (AM)"),
            new Vocab("午後", "ごご", "afternoon (PM)"),
            new Vocab("時", "とき", "time / when"),
            new Vocab("分", "ふん", "minute")
    );

    /* ── Quiz specs (first one keeps the original code so existing DBs skip it) ── */
    private static final List<QuizSpec> SEED_QUIZZES = List.of(
            new QuizSpec("SEED-N5-MIXED-50", "JLPT N5 · Mixed Practice (50)",
                    "Auto-generated sample quiz: 50 mixed N5 vocabulary questions. Owned by nobody.",
                    "N5", 30, 50, POOL_N5_CORE),
            new QuizSpec("SEED-N5-VERBS", "JLPT N5 · Common Verbs",
                    "Practice the most common N5 verbs — meanings, readings and usage.",
                    "N5", 15, 20, POOL_N5_VERBS),
            new QuizSpec("SEED-N5-ADJ", "JLPT N5 · Adjectives",
                    "Test yourself on essential N5 i-adjectives.",
                    "N5", 12, 18, POOL_N5_ADJ),
            new QuizSpec("SEED-DAILY-VOCAB", "Everyday Japanese Vocabulary",
                    "Food, transport, money and daily-life words for beginners.",
                    "N5", 12, 18, POOL_DAILY),
            new QuizSpec("SEED-NUM-TIME", "Time & Calendar Words",
                    "Days, parts of the day and time expressions.",
                    "N5", 10, 16, SEED_QUIZZES_POOL_TIME),
            new QuizSpec("SEED-N4-VOCAB", "JLPT N4 · Vocabulary",
                    "Step up to N4 with common abstract nouns.",
                    "N4", 18, 20, POOL_N4)
    );
}
