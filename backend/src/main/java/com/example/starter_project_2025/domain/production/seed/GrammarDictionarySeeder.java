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
 * Seeds the JLPT grammar-pattern dictionary used by the translate-page
 * "Grammar Spotter" ({@code GrammarSpotterService}).
 *
 * <p>Idempotent and additive: each entry is inserted only when its
 * {@code detectorKey} is absent, so it co-exists with the production-exercise
 * patterns from {@link ProductionSeeder} and can be extended freely. Each entry
 * stores a precise Java regex in {@code GrammarMarker.detectorSubkey} (matched
 * against the sentence) plus a display {@code markerPattern}.
 */
@Slf4j
@Component
@Order(101)
@RequiredArgsConstructor
public class GrammarDictionarySeeder implements CommandLineRunner {

    private final GrammarSubUseRepository subUseRepository;
    private final GrammarMarkerRepository markerRepository;
    private final GrammarSpotterService grammarSpotter;

    /** key, display pattern, JLPT level, Vietnamese nuance, detection regex. */
    private record Entry(String key, String pattern, String level, String nuance, String regex) {}

    private static final List<Entry> DICTIONARY = List.of(
            // ── N5 ──────────────────────────────────────────────────────────
            new Entry("spot_n5_tai", "～たい", "N5",
                    "Diễn tả mong muốn, nguyện vọng của người nói (muốn làm gì).",
                    "たい(です|と|の|な)?|たく(ない|なかった|て)"),
            new Entry("spot_n5_teiru", "～ている", "N5",
                    "Diễn tả hành động đang diễn ra hoặc trạng thái kéo dài.",
                    "てい(る|ます|た|ました|て|ない)|でい(る|ます|た|ました)"),
            new Entry("spot_n5_node", "～ので", "N5",
                    "Nêu lý do/nguyên nhân một cách mềm mỏng, lịch sự (vì…).",
                    "ので|んので"),
            new Entry("spot_n5_mashou", "～ましょう", "N5",
                    "Rủ rê, đề nghị cùng làm (…nào / chúng ta hãy…).",
                    "ましょう|ましょうか"),
            new Entry("spot_n5_kudasai", "～てください", "N5",
                    "Nhờ vả, yêu cầu lịch sự (xin hãy làm gì).",
                    "てください|でください|て下さい"),

            // ── N4 ──────────────────────────────────────────────────────────
            new Entry("spot_n4_nodaga", "～のだ／のだが", "N4",
                    "Mào đầu, giải thích bối cảnh hoặc nêu tương phản (…đấy, nhưng…).",
                    "の(だ|です)(が|けど|けれど|けれども)|ん(だ|です)(が|けど|けれど)"),
            new Entry("spot_n4_youtosuru", "～ようとする", "N4",
                    "Định/cố làm gì; thể phủ định ～ようとしない = nhất quyết không chịu làm.",
                    "うとし(ない|た|ている|ます|ません|なかった)?|うとする|うとした"),
            new Entry("spot_n4_kotogadekiru", "～ことができる", "N4",
                    "Diễn tả khả năng (có thể làm được việc gì).",
                    "ことができ|ことが出来|事ができ"),
            new Entry("spot_n4_takotogaaru", "～たことがある", "N4",
                    "Diễn tả kinh nghiệm đã từng làm gì.",
                    "たことがあ|だことがあ|た事がある"),
            new Entry("spot_n4_tsumori", "～つもり", "N4",
                    "Diễn tả dự định, ý định làm gì.",
                    "つもり|積もり"),
            new Entry("spot_n4_hougaii", "～ほうがいい", "N4",
                    "Đưa ra lời khuyên (nên làm gì thì hơn).",
                    "ほうがい|方がい|ほうがよ|方がよ"),
            new Entry("spot_n4_sugiru", "～すぎる", "N4",
                    "Diễn tả mức độ thái quá (quá…).",
                    "すぎ(る|ます|た|て|ない)|過ぎ(る|ます|た|て)"),
            new Entry("spot_n4_yasui_nikui", "～やすい／にくい", "N4",
                    "Diễn tả dễ làm (やすい) hoặc khó làm (にくい) việc gì.",
                    "やすい|にくい|易い|難い"),
            new Entry("spot_n4_nagara", "～ながら", "N4",
                    "Diễn tả hai hành động xảy ra đồng thời (vừa… vừa…).",
                    "ながら"),

            // ── N3 ──────────────────────────────────────────────────────────
            new Entry("spot_n3_kigasuru", "～気がする／気がない", "N3",
                    "気がする = cảm thấy/có cảm giác; 気がない・気もない = không có ý định, không buồn làm.",
                    "気(が|も)(する|します|した|ない|なく|なし|しない)"),
            new Entry("spot_n3_rashii", "～らしい", "N3",
                    "Diễn tả phán đoán dựa trên nghe/thấy (nghe nói/có vẻ).",
                    "らしい|らしく"),
            new Entry("spot_n3_souda", "～そうだ", "N3",
                    "Diễn tả vẻ ngoài/dự đoán (trông có vẻ…) hoặc tin nghe được.",
                    "そう(だ|です|な|に|で)"),
            new Entry("spot_n3_mitai", "～みたいだ", "N3",
                    "Diễn tả phỏng đoán/ví von thân mật (giống như, dường như).",
                    "みたい"),
            new Entry("spot_n3_hazu", "～はず", "N3",
                    "Diễn tả sự chắc chắn theo suy luận (chắc hẳn/đáng lẽ).",
                    "はず|筈"),
            new Entry("spot_n3_temo", "～ても", "N3",
                    "Diễn tả giả định nghịch (dù… thì vẫn…).",
                    "ても(いい|かまわない)?"),
            new Entry("spot_n3_noni", "～のに", "N3",
                    "Diễn tả trái ngược với mong đợi (mặc dù… vậy mà…).",
                    "のに"),
            new Entry("spot_n3_mattaku_nai", "全く～ない", "N3",
                    "Phủ định hoàn toàn, dùng kèm 全く／まったく／全然 (hoàn toàn không…).",
                    "全く|まったく|全然"),

            // ── N2 ──────────────────────────────────────────────────────────
            new Entry("spot_n2_bakari", "～ばかり", "N2",
                    "Chỉ toàn (ばかり) hoặc vừa mới làm xong (～たばかり).",
                    "ばかり|ばっかり|許り"),
            new Entry("spot_n2_wakeda", "～わけだ／わけではない", "N2",
                    "Tức là/hóa ra (わけだ); わけではない = không hẳn là.",
                    "わけ(だ|です|では|じゃ|がない)|訳(だ|では)"),
            new Entry("spot_n2_nitotte", "～にとって", "N2",
                    "Đứng ở lập trường ai đó để đánh giá (đối với…).",
                    "にとって|に取って"),
            new Entry("spot_n2_niyotte", "～によって", "N2",
                    "Tùy theo/bởi (による・によって) — phương tiện, nguyên nhân, tác nhân.",
                    "によって|により|による"),
            new Entry("spot_n2_kotoninaru", "～ことになる", "N2",
                    "Việc gì đó được quyết định (không do ý chí bản thân).",
                    "ことになっ|ことになる|事になる"),
            new Entry("spot_n2_youninaru", "～ようになる", "N2",
                    "Diễn tả sự thay đổi trạng thái/thói quen (trở nên… / dần dần…).",
                    "ようになっ|ようになる|ようにし"),
            new Entry("spot_n2_tabini", "～たびに", "N2",
                    "Mỗi lần… là lại… (cứ mỗi khi).",
                    "たびに|度に"),
            new Entry("spot_n2_oite", "～において", "N2",
                    "Trong/tại (bối cảnh, lĩnh vực, địa điểm — trang trọng).",
                    "において|における|に於いて"),

            // ── N1 ──────────────────────────────────────────────────────────
            new Entry("spot_n1_zaruwoenai", "～ざるを得ない", "N1",
                    "Buộc phải làm dù không muốn (không thể không…).",
                    "ざるを得ない|ざるをえない"),
            new Entry("spot_n1_nisuginai", "～にすぎない", "N1",
                    "Chẳng qua chỉ là, không hơn không kém.",
                    "にすぎない|に過ぎない"),
            new Entry("spot_n1_kanenai", "～かねない", "N1",
                    "Có khả năng xảy ra điều (xấu) (có thể sẽ…).",
                    "かねない"),
            new Entry("spot_n1_nihokanaranai", "～にほかならない", "N1",
                    "Không gì khác ngoài, chính là.",
                    "にほかならない|に外ならない|に他ならない"),
            new Entry("spot_n1_monono", "～ものの", "N1",
                    "Mặc dù… nhưng… (tuy đã… song…).",
                    "ものの"),
            new Entry("spot_n1_shidai", "～次第", "N1",
                    "Ngay khi (xong)… (次第); hoặc tùy thuộc vào.",
                    "次第|しだい"),
            new Entry("spot_n1_dokoroka", "～どころか", "N1",
                    "Đừng nói là…, trái lại còn… (chứ đừng nói…).",
                    "どころか"),
            new Entry("spot_n1_uede", "～うえで", "N1",
                    "Sau khi… rồi mới…; hoặc xét trên phương diện…",
                    "うえで|上で")
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
            log.info("Grammar Spotter dictionary seeded: {} new JLPT patterns", added);
        }
        // Always invalidate so the Aho-Corasick index is rebuilt with the latest data
        grammarSpotter.invalidateIndex();
    }
}
