package com.example.starter_project_2025.domain.production.seed;

import com.example.starter_project_2025.domain.production.grammar.GrammarMarker;
import com.example.starter_project_2025.domain.production.grammar.GrammarMarkerRepository;
import com.example.starter_project_2025.domain.production.grammar.GrammarSpotterService;
import com.example.starter_project_2025.domain.production.grammar.GrammarSubUse;
import com.example.starter_project_2025.domain.production.grammar.GrammarSubUseRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * "Basic grammar" layer for the translate-page Grammar Spotter.
 *
 * <p>The JLPT seeders ({@link GrammarDictionarySeeder}, {@link GrammarSpotterN3Seeder},
 * {@link GrammarSpotterBulkSeeder}) deliberately skip the universal building blocks of
 * Japanese — past-tense verbs, the を object particle, passive voice — because they appear
 * in almost every sentence and would normally be noise. An LLM such as Gemini happily
 * lists them anyway, so this seeder adds them back as an explicit, opt-in <b>basic</b> tier
 * for learners who want the same breadth the LLM gives.
 *
 * <p>By design these fire broadly (most sentences will light up at least 一-two of them).
 * They sort last because they are tagged N5 and the Spotter orders easiest → hardest.
 *
 * <p>All entries are Track B (hand-written regex), matched against the separator-free
 * surface join. No LLM at seed-time or runtime.
 */
@Slf4j
@Component
@Order(104)
@RequiredArgsConstructor
public class GrammarSpotterBasicSeeder implements CommandLineRunner {

    private final GrammarSubUseRepository subUseRepository;
    private final GrammarMarkerRepository markerRepository;
    private final GrammarSpotterService grammarSpotter;

    private record Entry(String key, String pattern, String level, String nuance, String regex) {}

    private static final List<Entry> DICTIONARY = List.of(
            new Entry("spot_basic_past", "～た／だ (thì quá khứ)", "N5",
                    "Thể quá khứ của động từ/tính từ: hành động đã xảy ra và kết thúc.",
                    "った|いた|えた|きた|来た|した|みた|見た|でた|てた|ねた|べた|めた|げた|せた|"
                    + "んだ|いだ|なかった|かった|だった|でした|ました|ませんでした"),
            new Entry("spot_basic_wo", "～を (trợ từ tân ngữ)", "N5",
                    "Trợ từ を đánh dấu tân ngữ trực tiếp của hành động.",
                    "を"),
            new Entry("spot_basic_ni_time", "～に (chỉ thời điểm)", "N5",
                    "Trợ từ に chỉ thời điểm xác định hành động xảy ra.",
                    "(日|時|分|時間|朝|昼|夜|晩|週|月|年|曜日|頃|ころ|時刻|時代)に"),
            new Entry("spot_basic_passive", "～れる／られる (thể bị động)", "N5",
                    "Thể bị động: chủ ngữ chịu tác động từ đối tượng khác.",
                    "される|され(た|て|ます|ない|よう|れ)|られる|られた|られて|られます|"
                    + "われた|かれた|がれた|まれた|ばれた|なれた|たれた|られない"),
            new Entry("spot_n4_kototonaru", "～こととなる／となる", "N4",
                    "(Kết cục) trở thành/ được quyết định là… (biến thể と của ことになる).",
                    "こと[にと]な(る|っ|り)|となっ(た|て)|となる(。|、|こと)|となり(、|ます)")
    );

    @Override
    public void run(String... args) {
        int added = 0;
        for (Entry e : DICTIONARY) {
            if (subUseRepository.existsByDetectorKey(e.key())) {
                continue;
            }
            GrammarSubUse su = subUseRepository.save(GrammarSubUse.builder()
                    .name(e.pattern())
                    .jlptLevel(e.level())
                    .detectorKey(e.key())
                    .nuanceDescription(e.nuance())
                    .build());
            markerRepository.save(GrammarMarker.builder()
                    .subUse(su)
                    .markerPattern(e.pattern())
                    .detectorSubkey(e.regex())
                    .build());
            added++;
        }
        if (added > 0) {
            log.info("Grammar Spotter basic dictionary seeded: {} new patterns", added);
        }
        grammarSpotter.invalidateIndex();
    }
}
