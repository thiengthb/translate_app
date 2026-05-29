package com.example.starter_project_2025.domain.production.seed;

import com.example.starter_project_2025.domain.production.grammar.*;
import com.example.starter_project_2025.domain.production.grammar.model.CommonMistake;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.List;

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
        if (subUseRepository.count() > 0) {
            return;
        }
        log.info("Seeding production-prompt grammar content...");

        seedObligation();
        seedTeShimau();
        seedConditionalBa();
        seedYouni();

        log.info("Production-prompt seed complete: {} grammar sub-uses", subUseRepository.count());
    }

    private void seedObligation() {
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
}
