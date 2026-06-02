package com.example.starter_project_2025.domain.production.seed;

import com.example.starter_project_2025.domain.production.grammar.*;
import com.example.starter_project_2025.domain.production.grammar.model.CommonMistake;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Seeds the production-exercise grammar bank (each grammar point becomes one or
 * more exercises on the "Luyện viết câu" page).
 *
 * <p>Idempotent and additive: every grammar point is keyed by its
 * {@code detectorKey} and inserted only when absent, so new points can be added
 * here and they will appear on existing databases without a reset.
 *
 * <p>The original four points ({@code n4_obligation}, {@code n4_te_shimau},
 * {@code n4_conditional_ba}, {@code n3_youni}) are graded by hand-written
 * MeCab {@code GrammarDetector}s. Every additional point is graded by the
 * regex-backed grammar bank via {@code GrammarSpotterService.matchesSubUse}, so
 * its markers carry a {@code detectorSubkey} regex and need no Java detector.
 */
@Slf4j
@Component
@Order(100)
@RequiredArgsConstructor
public class ProductionSeeder implements CommandLineRunner {

    private final GrammarSubUseRepository subUseRepository;
    private final GrammarMarkerRepository markerRepository;
    private final ReferenceSentenceRepository referenceRepository;
    private final ScenarioStubRepository scenarioRepository;

    @Override
    public void run(String... args) {
        int before = (int) subUseRepository.count();

        // ── Original four (hand-written MeCab detectors) ──────────────────
        seedObligation();
        seedTeShimau();
        seedConditionalBa();
        seedYouni();

        // ── Additional data-driven points (regex-backed grading) ─────────────
        seedAdditional();

        int added = (int) subUseRepository.count() - before;
        if (added > 0) {
            log.info("Production seeder: {} new grammar exercises added (total {})",
                    added, subUseRepository.count());
        }
    }

    // ── original four ────────────────────────────────────────────────────────

    private void seedObligation() {
        if (subUseRepository.existsByDetectorKey("n4_obligation")) return;
        GrammarSubUse su = subUseRepository.save(GrammarSubUse.builder()
                .name("Nghĩa vụ (～なければならない)")
                .jlptLevel("N4")
                .detectorKey("n4_obligation")
                .nuanceDescription("Diễn tả nghĩa vụ/điều bắt buộc phải làm do hoàn cảnh.")
                .commonMistakes(List.of(
                        new CommonMistake("dùng ～たい thay vì ～なければならない", "～たい là mong muốn, không phải nghĩa vụ"),
                        new CommonMistake("quên đuôi ならない/いけない", "cần đủ なければ + ならない")))
                .build());

        markerRepository.save(GrammarMarker.builder().subUse(su).markerPattern("～なければなりません").register("polite").frequencyRank(1).build());
        markerRepository.save(GrammarMarker.builder().subUse(su).markerPattern("～なきゃ").register("casual").frequencyRank(2).build());

        referenceRepository.save(ReferenceSentence.builder().subUse(su)
                .l1Text("I have an exam tomorrow, so I must study tonight.")
                .l2Text("明日試験があるので、今夜は勉強しなければなりません。").build());

        scenarioRepository.save(ScenarioStub.builder().subUse(su).register("polite")
                .situationContext("A friend invites you out tonight, but you have an exam tomorrow.")
                .l1PromptTemplate("[SITUATION] Your friend invites you out tonight, but you have an exam tomorrow and need to study. Politely decline and explain why.\n[WORDS] 試験 (exam), 勉強する (to study)\n[REGISTER] polite (です/ます)")
                .build());
    }

    private void seedTeShimau() {
        if (subUseRepository.existsByDetectorKey("n4_te_shimau")) return;
        GrammarSubUse su = subUseRepository.save(GrammarSubUse.builder()
                .name("Hoàn tất/tiếc nuối (～てしまう)")
                .jlptLevel("N4")
                .detectorKey("n4_te_shimau")
                .nuanceDescription("Diễn tả hành động đã hoàn tất, thường kèm sắc thái tiếc nuối hoặc ngoài ý muốn.")
                .commonMistakes(List.of(
                        new CommonMistake("dùng thể từ điển thay vì thể て", "cần động từ ở thể て + しまう")))
                .build());

        markerRepository.save(GrammarMarker.builder().subUse(su).markerPattern("～てしまいました").register("polite").frequencyRank(1).build());
        markerRepository.save(GrammarMarker.builder().subUse(su).markerPattern("～ちゃった").register("casual").frequencyRank(2).build());

        referenceRepository.save(ReferenceSentence.builder().subUse(su)
                .l1Text("I accidentally ate all the cake.")
                .l2Text("ケーキを全部食べてしまいました。").build());

        scenarioRepository.save(ScenarioStub.builder().subUse(su).register("polite")
                .situationContext("You did something by accident and regret it.")
                .l1PromptTemplate("[SITUATION] You came home and realized you ate the whole cake that was meant for everyone. Admit what happened, showing regret.\n[WORDS] ケーキ (cake), 全部 (all), 食べる (to eat)\n[REGISTER] polite (です/ます)")
                .build());
    }

    private void seedConditionalBa() {
        if (subUseRepository.existsByDetectorKey("n4_conditional_ba")) return;
        GrammarSubUse su = subUseRepository.save(GrammarSubUse.builder()
                .name("Điều kiện (～ば)")
                .jlptLevel("N4")
                .detectorKey("n4_conditional_ba")
                .nuanceDescription("Diễn tả điều kiện giả định: nếu ... thì ...")
                .commonMistakes(List.of(
                        new CommonMistake("chia sai thể giả định", "động từ phải ở 仮定形 trước ば")))
                .build());

        markerRepository.save(GrammarMarker.builder().subUse(su).markerPattern("～ば").register("plain").frequencyRank(1).build());

        referenceRepository.save(ReferenceSentence.builder().subUse(su)
                .l1Text("If you study, you will pass.")
                .l2Text("勉強すれば、合格します。").build());

        scenarioRepository.save(ScenarioStub.builder().subUse(su).register("plain")
                .situationContext("Give advice stating a condition and its result.")
                .l1PromptTemplate("[SITUATION] Your friend worries about an exam. Reassure them by saying that if they study, they will pass.\n[WORDS] 勉強する (to study), 合格する (to pass)\n[REGISTER] plain")
                .build());
    }

    private void seedYouni() {
        if (subUseRepository.existsByDetectorKey("n3_youni")) return;
        GrammarSubUse su = subUseRepository.save(GrammarSubUse.builder()
                .name("Mục đích (～ように)")
                .jlptLevel("N3")
                .detectorKey("n3_youni")
                .nuanceDescription("Diễn tả mục đích/để đạt được trạng thái nào đó (thường với động từ khả năng/vô ý chí).")
                .commonMistakes(List.of(
                        new CommonMistake("dùng ～ために với động từ khả năng", "với động từ khả năng/vô ý chí dùng ～ように")))
                .build());

        markerRepository.save(GrammarMarker.builder().subUse(su).markerPattern("～ように").register("polite").frequencyRank(1).build());

        referenceRepository.save(ReferenceSentence.builder().subUse(su)
                .l1Text("I study every day so that I can speak Japanese.")
                .l2Text("日本語が話せるように、毎日勉強しています。").build());

        scenarioRepository.save(ScenarioStub.builder().subUse(su).register("polite")
                .situationContext("Explain a habit done in order to reach an ability goal.")
                .l1PromptTemplate("[SITUATION] Explain that you study every day in order to become able to speak Japanese.\n[WORDS] 日本語 (Japanese), 話せる (can speak), 毎日 (every day), 勉強する (to study)\n[REGISTER] polite (です/ます)")
                .build());
    }

    // ── additional data-driven points (regex-backed) ──────────────────────────

    /** A grammar marker with the regex used by the fallback grader. */
    private record Mark(String pattern, String register, String regex) {}

    /** One self-contained production exercise. */
    private record Prompt(
            String key, String name, String level, String nuance,
            List<CommonMistake> mistakes, List<Mark> markers,
            String l1Text, String l2Text,
            String register, String situation, String l1Prompt) {}

    private static final List<Prompt> ADDITIONAL = List.of(
            new Prompt("prod_n5_tai", "Mong muốn (～たい)", "N5",
                    "Diễn tả nguyện vọng của chính người nói (muốn làm gì).",
                    List.of(new CommonMistake("dùng ほしい cho hành động", "động từ + たい; ほしい dùng cho đồ vật")),
                    List.of(new Mark("～たい", "polite", "たい(です|と|の|な)?|たく(ない|なかった|て)")),
                    "I want to go to Japan next year.",
                    "来年、日本へ行きたいです。",
                    "polite",
                    "Talk about a future wish.",
                    "[SITUATION] Tell a classmate about your dream: you want to go to Japan next year.\n[WORDS] 来年 (next year), 日本 (Japan), 行く (to go)\n[REGISTER] polite (です/ます)"),

            new Prompt("prod_n5_kudasai", "Nhờ vả lịch sự (～てください)", "N5",
                    "Nhờ/yêu cầu ai đó làm gì một cách lịch sự (xin hãy…).",
                    List.of(new CommonMistake("dùng thể từ điển", "cần động từ thể て + ください")),
                    List.of(new Mark("～てください", "polite", "てください|でください|て下さい")),
                    "Please speak a little more slowly.",
                    "もう少しゆっくり話してください。",
                    "polite",
                    "Politely ask someone to adjust how they speak.",
                    "[SITUATION] The teacher speaks too fast. Politely ask them to speak a little more slowly.\n[WORDS] もう少し (a little more), ゆっくり (slowly), 話す (to speak)\n[REGISTER] polite (です/ます)"),

            new Prompt("prod_n4_kotogadekiru", "Khả năng (～ことができる)", "N4",
                    "Diễn tả khả năng làm được việc gì.",
                    List.of(new CommonMistake("quên が", "danh từ/động từ-thể từ điển + ことができる")),
                    List.of(new Mark("～ことができる", "polite", "ことができ|ことが出来|事ができ")),
                    "I can read kanji a little.",
                    "漢字を少し読むことができます。",
                    "polite",
                    "State an ability you have.",
                    "[SITUATION] Tell your teacher that you can read kanji a little.\n[WORDS] 漢字 (kanji), 少し (a little), 読む (to read)\n[REGISTER] polite (です/ます)"),

            new Prompt("prod_n4_takotogaaru", "Kinh nghiệm (～たことがある)", "N4",
                    "Diễn tả kinh nghiệm đã từng làm gì.",
                    List.of(new CommonMistake("dùng thì hiện tại", "cần động từ thể た + ことがある")),
                    List.of(new Mark("～たことがある", "polite", "たことがあ|だことがあ|た事がある")),
                    "I have eaten natto before.",
                    "納豆を食べたことがあります。",
                    "polite",
                    "Share a past experience.",
                    "[SITUATION] A friend asks about Japanese food. Say that you have eaten natto before.\n[WORDS] 納豆 (natto), 食べる (to eat)\n[REGISTER] polite (です/ます)"),

            new Prompt("prod_n4_hougaii", "Lời khuyên (～ほうがいい)", "N4",
                    "Khuyên nên làm gì thì hơn.",
                    List.of(new CommonMistake("dùng thể từ điển cho lời khuyên nên làm", "lời khuyên nên làm dùng động từ thể た + ほうがいい")),
                    List.of(new Mark("～ほうがいい", "plain", "ほうがい|方がい|ほうがよ|方がよ")),
                    "You had better rest today.",
                    "今日は休んだほうがいいです。",
                    "polite",
                    "Advise a sick friend.",
                    "[SITUATION] Your friend looks sick. Advise them that they had better rest today.\n[WORDS] 今日 (today), 休む (to rest)\n[REGISTER] polite (です/ます)"),

            new Prompt("prod_n4_tsumori", "Dự định (～つもり)", "N4",
                    "Diễn tả dự định, ý định làm gì.",
                    List.of(new CommonMistake("dùng でしょう", "dự định chắc chắn dùng つもり, không phải phỏng đoán")),
                    List.of(new Mark("～つもり", "polite", "つもり|積もり")),
                    "I intend to study abroad next year.",
                    "来年、留学するつもりです。",
                    "polite",
                    "State a firm plan.",
                    "[SITUATION] Tell your teacher your plan: you intend to study abroad next year.\n[WORDS] 来年 (next year), 留学する (to study abroad)\n[REGISTER] polite (です/ます)"),

            new Prompt("prod_n4_sugiru", "Thái quá (～すぎる)", "N4",
                    "Diễn tả mức độ thái quá (quá…).",
                    List.of(new CommonMistake("giữ nguyên い của tính từ", "bỏ い: 高い→高すぎる")),
                    List.of(new Mark("～すぎる", "polite", "すぎ(る|ます|た|て|ない)|過ぎ(る|ます|た|て)")),
                    "I ate too much last night.",
                    "昨夜は食べすぎました。",
                    "polite",
                    "Complain about overdoing something.",
                    "[SITUATION] You feel sick today. Explain that you ate too much last night.\n[WORDS] 昨夜 (last night), 食べる (to eat)\n[REGISTER] polite (です/ます)"),

            new Prompt("prod_n3_temo", "Giả định nghịch (～ても)", "N3",
                    "Dù… thì vẫn… (nhượng bộ).",
                    List.of(new CommonMistake("dùng から/ので", "nhượng bộ dùng động từ thể て + も")),
                    List.of(new Mark("～ても", "polite", "ても|でも")),
                    "Even if it rains tomorrow, I will go.",
                    "明日雨が降っても、行きます。",
                    "polite",
                    "Express determination despite an obstacle.",
                    "[SITUATION] You plan to attend an event. Say that even if it rains tomorrow, you will go.\n[WORDS] 明日 (tomorrow), 雨が降る (to rain), 行く (to go)\n[REGISTER] polite (です/ます)"),

            new Prompt("prod_n3_noni", "Trái mong đợi (～のに)", "N3",
                    "Mặc dù… vậy mà… (kết quả trái với mong đợi, kèm cảm xúc).",
                    List.of(new CommonMistake("dùng が trung tính", "のに mang sắc thái bất ngờ/bất mãn")),
                    List.of(new Mark("～のに", "plain", "のに")),
                    "Although I studied hard, I failed the test.",
                    "たくさん勉強したのに、テストに落ちました。",
                    "polite",
                    "Express frustration about an unexpected result.",
                    "[SITUATION] You studied hard but still failed. Express your frustration about this unexpected result.\n[WORDS] 勉強する (to study), テスト (test), 落ちる (to fail)\n[REGISTER] polite (です/ます)"),

            new Prompt("prod_n3_hazu", "Suy luận chắc chắn (～はず)", "N3",
                    "Chắc hẳn… (suy luận có căn cứ).",
                    List.of(new CommonMistake("dùng cho ý chí bản thân", "はず dùng cho suy luận, không phải dự định của mình")),
                    List.of(new Mark("～はず", "polite", "はず|筈")),
                    "He studied a lot, so he should pass.",
                    "彼はたくさん勉強したから、合格するはずです。",
                    "polite",
                    "Predict an outcome based on evidence.",
                    "[SITUATION] Your friend studied a lot. Say that he should pass the exam (you are fairly sure).\n[WORDS] 彼 (he), 勉強する (to study), 合格する (to pass)\n[REGISTER] polite (です/ます)"),

            new Prompt("prod_n2_nitotte", "Lập trường (～にとって)", "N2",
                    "Đứng ở lập trường của ai đó để đánh giá (đối với…).",
                    List.of(new CommonMistake("nhầm với について", "にとって = đối với; について = về việc")),
                    List.of(new Mark("～にとって", "polite", "にとって|に取って")),
                    "For me, family is the most important thing.",
                    "私にとって、家族が一番大切です。",
                    "polite",
                    "State what matters most from your viewpoint.",
                    "[SITUATION] In a self-introduction, say that for you, family is the most important thing.\n[WORDS] 私 (I), 家族 (family), 一番 (most), 大切 (important)\n[REGISTER] polite (です/ます)"),

            new Prompt("prod_n2_youninaru", "Thay đổi trạng thái (～ようになる)", "N2",
                    "Trở nên… / dần dần biết làm gì (thay đổi theo thời gian).",
                    List.of(new CommonMistake("dùng với trạng thái tức thời", "ようになる nhấn mạnh quá trình thay đổi")),
                    List.of(new Mark("～ようになる", "polite", "ようになっ|ようになり|ようになる")),
                    "I have come to be able to read Japanese newspapers.",
                    "日本語の新聞が読めるようになりました。",
                    "polite",
                    "Describe a gradual improvement.",
                    "[SITUATION] After a year of study, explain that you have come to be able to read Japanese newspapers.\n[WORDS] 日本語 (Japanese), 新聞 (newspaper), 読める (can read)\n[REGISTER] polite (です/ます)"),

            new Prompt("prod_n1_zaruwoenai", "Buộc phải (～ざるを得ない)", "N1",
                    "Không thể không làm / buộc phải làm dù không muốn.",
                    List.of(new CommonMistake("dùng với する sai", "する→せざるを得ない (bất quy tắc)")),
                    List.of(new Mark("～ざるを得ない", "formal", "ざるを得ない|ざるをえない")),
                    "Given the situation, we have no choice but to cancel the trip.",
                    "この状況では、旅行を中止せざるを得ません。",
                    "formal",
                    "Reluctantly announce an unavoidable decision.",
                    "[SITUATION] Due to a typhoon, you must cancel a company trip. Formally announce that you have no choice but to cancel.\n[WORDS] 状況 (situation), 旅行 (trip), 中止する (to cancel)\n[REGISTER] formal (polite)")
    );

    private void seedAdditional() {
        for (Prompt p : ADDITIONAL) {
            if (subUseRepository.existsByDetectorKey(p.key())) {
                continue;
            }
            GrammarSubUse su = subUseRepository.save(GrammarSubUse.builder()
                    .name(p.name())
                    .jlptLevel(p.level())
                    .detectorKey(p.key())
                    .nuanceDescription(p.nuance())
                    .commonMistakes(p.mistakes())
                    .build());

            int rank = 1;
            for (Mark m : p.markers()) {
                markerRepository.save(GrammarMarker.builder()
                        .subUse(su)
                        .markerPattern(m.pattern())
                        .register(m.register())
                        .detectorSubkey(m.regex())
                        .frequencyRank(rank++)
                        .build());
            }

            referenceRepository.save(ReferenceSentence.builder()
                    .subUse(su)
                    .l1Text(p.l1Text())
                    .l2Text(p.l2Text())
                    .build());

            scenarioRepository.save(ScenarioStub.builder()
                    .subUse(su)
                    .register(p.register())
                    .situationContext(p.situation())
                    .l1PromptTemplate(p.l1Prompt())
                    .build());
        }
    }
}
