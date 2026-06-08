package com.example.starter_project_2025.domain.production.seed;

import com.example.starter_project_2025.domain.production.grammar.GrammarMarker;
import com.example.starter_project_2025.domain.production.grammar.GrammarMarkerRepository;
import com.example.starter_project_2025.domain.production.grammar.GrammarSpotterService;
import com.example.starter_project_2025.domain.production.grammar.GrammarSubUse;
import com.example.starter_project_2025.domain.production.grammar.GrammarSubUseRepository;
import com.example.starter_project_2025.system.words.level.LevelLookup;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Seeds the JLPT grammar-pattern dictionary used by the translate-page
 * "Grammar Spotter" ({@code GrammarSpotterService}).
 *
 * <p><b>Standardised set.</b> Together with {@link ProductionSeeder} this forms a
 * single canonical bank of <b>40 grammar points</b> (focused on N4/N3). This seeder
 * owns the 23 spotter-only patterns; the other 17 (with drill scenarios) live in
 * {@link ProductionSeeder}. The two sets are disjoint — no pattern is seeded twice —
 * so the Grammar Spotter and the production drill read one consistent set.
 *
 * <p>Idempotent and additive: each entry is inserted only when its
 * {@code detectorKey} is absent. Each entry stores a precise Java regex in
 * {@code GrammarMarker.detectorSubkey} (matched against the sentence) plus a display
 * {@code markerPattern}.
 */
@Slf4j
@Component
@Order(101)
@RequiredArgsConstructor
public class GrammarDictionarySeeder implements CommandLineRunner {

    private final GrammarSubUseRepository subUseRepository;
    private final GrammarMarkerRepository markerRepository;
    private final GrammarSpotterService grammarSpotter;
    private final LevelLookup levelLookup;

    /** key, display pattern, JLPT level, Vietnamese nuance, detection regex. */
    private record Entry(String key, String pattern, String level, String nuance, String regex) {}

    private static final List<Entry> DICTIONARY = List.of(
            // ── N5 ──────────────────────────────────────────────────────────
            new Entry("spot_n5_teiru", "～ている", "N5",
                    "Diễn tả hành động đang diễn ra hoặc trạng thái kéo dài.",
                    "てい(る|ます|まし|た|ました|て|ない)|でい(る|ます|まし|た|ました)"),
            new Entry("spot_n5_tewaikenai", "～てはいけない", "N5",
                    "Cấm đoán: không được làm gì.",
                    "てはいけ|てはだめ|ではいけ|ちゃいけ|ちゃだめ|じゃいけ"),

            // ── N4 ──────────────────────────────────────────────────────────
            new Entry("spot_n4_youtosuru", "～ようとする", "N4",
                    "Định/cố làm gì; thể phủ định ～ようとしない = nhất quyết không chịu làm.",
                    "うとし(ない|た|ている|ます|ません|なかった)?|うとする|うとした"),
            new Entry("spot_n4_yasui_nikui", "～やすい／にくい", "N4",
                    "Diễn tả dễ làm (やすい) hoặc khó làm (にくい) việc gì.",
                    "やすい|にくい|易い|難い"),
            new Entry("spot_n4_nagara", "～ながら", "N4",
                    "Diễn tả hai hành động xảy ra đồng thời (vừa… vừa…).",
                    "ながら"),
            new Entry("spot_n4_temoii", "～てもいい", "N4",
                    "Cho phép: được làm gì cũng không sao.",
                    "てもいい|でもいい|てもよ|でもよ|ても構わ|てもかまわ"),
            new Entry("spot_n4_tara", "～たら", "N4",
                    "Điều kiện/sau khi: nếu… thì…, khi… thì…",
                    "たら(どう)?|だら"),
            // させ = Ichidan causative (食べさせる); ませ = Godan causative (読ませる, 飲ませる)
            // ませ followed by ん (ません) is NOT matched, so no false-positives on negatives
            new Entry("spot_n4_saseru", "～させる (sai khiến)", "N4",
                    "Thể sai khiến: bắt/để ai đó làm gì.",
                    "させ(る|ます|まし|た|て|られ)|ませ(る|ます|まし|た|て|られ)"),
            new Entry("spot_n4_aida", "～間に", "N4",
                    "Trong lúc/khoảng thời gian đang… thì…",
                    "間に|あいだに"),

            // ── N3 ──────────────────────────────────────────────────────────
            new Entry("spot_n3_rashii", "～らしい", "N3",
                    "Diễn tả phán đoán dựa trên nghe/thấy (nghe nói/có vẻ).",
                    "らしい|らしく"),
            new Entry("spot_n3_souda", "～そうだ", "N3",
                    "Diễn tả vẻ ngoài/dự đoán (trông có vẻ…) hoặc tin nghe được.",
                    "そう(だ|です|な|に|で)"),
            new Entry("spot_n3_mitai", "～みたいだ", "N3",
                    "Diễn tả phỏng đoán/ví von thân mật (giống như, dường như).",
                    "みたい"),
            new Entry("spot_n3_tameni", "～ために", "N3",
                    "Mục đích (để…) hoặc nguyên nhân (vì…).",
                    "ために|ための|為に"),
            new Entry("spot_n3_kamoshirenai", "～かもしれない", "N3",
                    "Phỏng đoán có thể: có lẽ, biết đâu.",
                    "かもしれ|かも知れ|かもね"),
            new Entry("spot_n3_baai", "～場合", "N3",
                    "Trong trường hợp…",
                    "場合|ばあい"),
            new Entry("spot_n3_uchini", "～うちに", "N3",
                    "Tranh thủ khi còn…/trong lúc còn… thì làm gì.",
                    "うちに|内に"),
            new Entry("spot_n3_toiu", "～という", "N3",
                    "Gọi là/cái gọi là/nghe nói rằng (dẫn nội dung, tên gọi).",
                    "という|と言う|っていう"),
            new Entry("spot_n3_okagede", "～おかげで", "N3",
                    "Nhờ có… (kết quả tốt).",
                    "おかげで|お陰で|おかげさま"),
            new Entry("spot_n3_seide", "～せいで", "N3",
                    "Tại vì/do… (kết quả xấu, quy lỗi).",
                    "せいで|せいか|せいだ|所為で"),

            // ── N2 ──────────────────────────────────────────────────────────
            new Entry("spot_n2_niyotte", "～によって", "N2",
                    "Tùy theo/bởi (による・によって) — phương tiện, nguyên nhân, tác nhân.",
                    "によって|により|による"),
            new Entry("spot_n2_bakari", "～ばかり", "N2",
                    "Chỉ toàn (ばかり) hoặc vừa mới làm xong (～たばかり).",
                    "ばかり|ばっかり|許り"),
            new Entry("spot_n2_chigainai", "～に違いない", "N2",
                    "Chắc chắn là…/nhất định là…",
                    "に違いない|にちがいない"),

            // ── N1 ──────────────────────────────────────────────────────────
            new Entry("spot_n1_bekida", "～べきだ", "N1",
                    "Nên/phải làm gì (bổn phận, lẽ phải).",
                    "べきだ|べきで|べきです|べきではない|べきじゃ")
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
                    .level(levelLookup.byCode(e.level()))
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
            log.info("Grammar Spotter dictionary seeded: {} new JLPT patterns", added);
        }
        // Always invalidate so the Aho-Corasick index is rebuilt with the latest data
        grammarSpotter.invalidateIndex();
    }
}
