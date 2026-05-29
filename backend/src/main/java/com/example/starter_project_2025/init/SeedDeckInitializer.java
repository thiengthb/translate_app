package com.example.starter_project_2025.init;

import com.example.starter_project_2025.domain.library.deck.Deck;
import com.example.starter_project_2025.domain.library.deck.DeckRepository;
import com.example.starter_project_2025.domain.library.deck_item.DeckItem;
import com.example.starter_project_2025.domain.library.deck_item.DeckItemRepository;
import com.example.starter_project_2025.domain.library.flashcard.ContentType;
import com.example.starter_project_2025.domain.library.flashcard.Flashcard;
import com.example.starter_project_2025.domain.library.flashcard.FlashcardRepository;
import com.example.starter_project_2025.domain.library.flashcard.FlashcardSide;
import com.example.starter_project_2025.domain.library.flashcard.FlashcardSideContent;
import com.example.starter_project_2025.domain.library.flashcard.SideType;
import com.example.starter_project_2025.system.rbac.user.User;
import com.example.starter_project_2025.system.rbac.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

/**
 * Seeds public sample decks owned by the admin user so the Community page has content
 * the first time the app boots. Idempotent — re-running on subsequent boots skips any
 * deck whose title already exists for the admin.
 */
@Slf4j
@Order(12)
@Component
@RequiredArgsConstructor
public class SeedDeckInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final DeckRepository deckRepository;
    private final DeckItemRepository deckItemRepository;
    private final FlashcardRepository flashcardRepository;

    @Value("${app.seed.admin.email:admin@example.com}")
    private String adminEmail;

    @Override
    @Transactional
    public void run(String... args) {
        User owner = userRepository.findByEmail(adminEmail).orElse(null);
        if (owner == null) {
            log.warn("Skipping community deck seed — admin user {} not found.", adminEmail);
            return;
        }

        int created = 0;
        for (SeedDeck spec : SEED_DECKS) {
            if (deckRepository.existsByTitleAndUserId(spec.title, owner.getId())) continue;
            createSeedDeck(owner, spec);
            created++;
        }
        log.info("Community seed: {} new decks created (of {} defined).", created, SEED_DECKS.size());
    }

    /* ─────────────────────────────────────────
       Build one deck + its flashcards
    ───────────────────────────────────────── */
    private void createSeedDeck(User owner, SeedDeck spec) {
        Deck deck = Deck.builder()
                .user(owner)
                .title(spec.title)
                .description(spec.description)
                .visibility("PUBLIC")
                .studyMode(spec.studyMode)
                .sourceLanguage(spec.sourceLang)
                .targetLanguage(spec.targetLang)
                .totalCards(0)
                .build();
        Deck savedDeck = deckRepository.save(deck);

        int order = 0;
        for (SeedCard card : spec.cards) {
            Flashcard fc = Flashcard.builder()
                    .cardType("BASIC")
                    .itemType("WORD")
                    .itemId(0L)
                    .front(card.front)
                    .back(card.back)
                    .sides(new ArrayList<>())
                    .build();

            FlashcardSide front = FlashcardSide.builder()
                    .flashcard(fc)
                    .side(SideType.FRONT)
                    .contents(new ArrayList<>())
                    .build();
            front.getContents().add(FlashcardSideContent.builder()
                    .side(front)
                    .label(spec.frontLabel)
                    .contentType(ContentType.TEXT)
                    .contentValue(card.front)
                    .orderIndex(0)
                    .build());

            FlashcardSide back = FlashcardSide.builder()
                    .flashcard(fc)
                    .side(SideType.BACK)
                    .contents(new ArrayList<>())
                    .build();
            back.getContents().add(FlashcardSideContent.builder()
                    .side(back)
                    .label(spec.backLabel)
                    .contentType(ContentType.TEXT)
                    .contentValue(card.back)
                    .orderIndex(0)
                    .build());

            fc.getSides().add(front);
            fc.getSides().add(back);
            Flashcard savedFc = flashcardRepository.save(fc);

            deckItemRepository.save(DeckItem.builder()
                    .deck(savedDeck)
                    .flashcard(savedFc)
                    .orderIndex(order++)
                    .build());
        }

        savedDeck.setTotalCards(spec.cards.size());
        deckRepository.save(savedDeck);
    }

    /* ─────────────────────────────────────────
       Static seed definitions
    ───────────────────────────────────────── */
    private record SeedCard(String front, String back) {}
    private record SeedDeck(
            String title,
            String description,
            String studyMode,
            String sourceLang,
            String targetLang,
            String frontLabel,
            String backLabel,
            List<SeedCard> cards
    ) {}

    private static final List<SeedDeck> SEED_DECKS = List.of(

            // ─── 1. Greetings ───────────────────────────────────
            new SeedDeck(
                    "JLPT N5 · Chào hỏi cơ bản",
                    "Những câu chào hỏi thông dụng nhất trong tiếng Nhật. Bắt đầu học từ đây!",
                    "QUIZLET", "ja", "vi", "Tiếng Nhật", "Nghĩa",
                    List.of(
                            new SeedCard("こんにちは", "Xin chào (ban ngày)"),
                            new SeedCard("おはようございます", "Chào buổi sáng"),
                            new SeedCard("こんばんは", "Chào buổi tối"),
                            new SeedCard("おやすみなさい", "Chúc ngủ ngon"),
                            new SeedCard("さようなら", "Tạm biệt"),
                            new SeedCard("またね", "Hẹn gặp lại"),
                            new SeedCard("ありがとうございます", "Cảm ơn"),
                            new SeedCard("すみません", "Xin lỗi / Làm phiền"),
                            new SeedCard("はじめまして", "Rất hân hạnh được gặp"),
                            new SeedCard("お元気ですか", "Bạn có khỏe không?"),
                            new SeedCard("元気です", "Tôi khỏe"),
                            new SeedCard("いただきます", "Xin mời (trước khi ăn)"),
                            new SeedCard("ごちそうさまでした", "Cảm ơn vì bữa ăn"),
                            new SeedCard("いってきます", "Tôi đi đây"),
                            new SeedCard("ただいま", "Tôi đã về")
                    )
            ),

            // ─── 2. Numbers ─────────────────────────────────────
            new SeedDeck(
                    "JLPT N5 · Số đếm 1-20",
                    "Các số cơ bản từ 1 đến 20 bằng tiếng Nhật.",
                    "QUIZLET", "ja", "vi", "Kanji", "Đọc + Nghĩa",
                    List.of(
                            new SeedCard("一", "いち · một"),
                            new SeedCard("二", "に · hai"),
                            new SeedCard("三", "さん · ba"),
                            new SeedCard("四", "よん/し · bốn"),
                            new SeedCard("五", "ご · năm"),
                            new SeedCard("六", "ろく · sáu"),
                            new SeedCard("七", "なな/しち · bảy"),
                            new SeedCard("八", "はち · tám"),
                            new SeedCard("九", "きゅう/く · chín"),
                            new SeedCard("十", "じゅう · mười"),
                            new SeedCard("十一", "じゅういち · mười một"),
                            new SeedCard("十二", "じゅうに · mười hai"),
                            new SeedCard("十三", "じゅうさん · mười ba"),
                            new SeedCard("十四", "じゅうよん · mười bốn"),
                            new SeedCard("十五", "じゅうご · mười lăm"),
                            new SeedCard("十六", "じゅうろく · mười sáu"),
                            new SeedCard("十七", "じゅうなな · mười bảy"),
                            new SeedCard("十八", "じゅうはち · mười tám"),
                            new SeedCard("十九", "じゅうきゅう · mười chín"),
                            new SeedCard("二十", "にじゅう · hai mươi")
                    )
            ),

            // ─── 3. Family ──────────────────────────────────────
            new SeedDeck(
                    "JLPT N5 · Gia đình",
                    "Từ vựng về thành viên trong gia đình. Lưu ý có 2 dạng: của mình và của người khác.",
                    "QUIZLET", "ja", "vi", "Tiếng Nhật", "Nghĩa",
                    List.of(
                            new SeedCard("家族 (かぞく)", "Gia đình"),
                            new SeedCard("父 (ちち)", "Bố tôi"),
                            new SeedCard("お父さん (おとうさん)", "Bố (người khác)"),
                            new SeedCard("母 (はは)", "Mẹ tôi"),
                            new SeedCard("お母さん (おかあさん)", "Mẹ (người khác)"),
                            new SeedCard("兄 (あに)", "Anh trai tôi"),
                            new SeedCard("お兄さん (おにいさん)", "Anh trai (người khác)"),
                            new SeedCard("姉 (あね)", "Chị gái tôi"),
                            new SeedCard("お姉さん (おねえさん)", "Chị gái (người khác)"),
                            new SeedCard("弟 (おとうと)", "Em trai"),
                            new SeedCard("妹 (いもうと)", "Em gái"),
                            new SeedCard("祖父 (そふ)", "Ông"),
                            new SeedCard("祖母 (そぼ)", "Bà"),
                            new SeedCard("子供 (こども)", "Con (cái)")
                    )
            ),

            // ─── 4. Days of the week ────────────────────────────
            new SeedDeck(
                    "JLPT N5 · Thứ trong tuần",
                    "Các thứ trong tuần bằng tiếng Nhật — kết thúc bằng 「曜日」(youbi).",
                    "QUIZLET", "ja", "vi", "Tiếng Nhật", "Nghĩa",
                    List.of(
                            new SeedCard("月曜日 (げつようび)", "Thứ Hai"),
                            new SeedCard("火曜日 (かようび)", "Thứ Ba"),
                            new SeedCard("水曜日 (すいようび)", "Thứ Tư"),
                            new SeedCard("木曜日 (もくようび)", "Thứ Năm"),
                            new SeedCard("金曜日 (きんようび)", "Thứ Sáu"),
                            new SeedCard("土曜日 (どようび)", "Thứ Bảy"),
                            new SeedCard("日曜日 (にちようび)", "Chủ Nhật"),
                            new SeedCard("週末 (しゅうまつ)", "Cuối tuần"),
                            new SeedCard("平日 (へいじつ)", "Ngày thường")
                    )
            ),

            // ─── 5. Months ──────────────────────────────────────
            new SeedDeck(
                    "JLPT N5 · 12 tháng",
                    "Các tháng trong năm. Trong tiếng Nhật chỉ cần thêm 「月」(gatsu) sau số.",
                    "QUIZLET", "ja", "vi", "Tiếng Nhật", "Nghĩa",
                    List.of(
                            new SeedCard("一月 (いちがつ)", "Tháng 1"),
                            new SeedCard("二月 (にがつ)", "Tháng 2"),
                            new SeedCard("三月 (さんがつ)", "Tháng 3"),
                            new SeedCard("四月 (しがつ)", "Tháng 4"),
                            new SeedCard("五月 (ごがつ)", "Tháng 5"),
                            new SeedCard("六月 (ろくがつ)", "Tháng 6"),
                            new SeedCard("七月 (しちがつ)", "Tháng 7"),
                            new SeedCard("八月 (はちがつ)", "Tháng 8"),
                            new SeedCard("九月 (くがつ)", "Tháng 9"),
                            new SeedCard("十月 (じゅうがつ)", "Tháng 10"),
                            new SeedCard("十一月 (じゅういちがつ)", "Tháng 11"),
                            new SeedCard("十二月 (じゅうにがつ)", "Tháng 12")
                    )
            ),

            // ─── 6. Colors ──────────────────────────────────────
            new SeedDeck(
                    "JLPT N5 · Màu sắc",
                    "Các màu sắc cơ bản. Lưu ý phân biệt dạng danh từ (-iro) và tính từ (-i).",
                    "QUIZLET", "ja", "vi", "Tiếng Nhật", "Nghĩa",
                    List.of(
                            new SeedCard("赤 (あか)", "Màu đỏ"),
                            new SeedCard("青 (あお)", "Màu xanh dương"),
                            new SeedCard("黄色 (きいろ)", "Màu vàng"),
                            new SeedCard("緑 (みどり)", "Màu xanh lá"),
                            new SeedCard("白 (しろ)", "Màu trắng"),
                            new SeedCard("黒 (くろ)", "Màu đen"),
                            new SeedCard("茶色 (ちゃいろ)", "Màu nâu"),
                            new SeedCard("紫 (むらさき)", "Màu tím"),
                            new SeedCard("ピンク", "Màu hồng"),
                            new SeedCard("オレンジ", "Màu cam"),
                            new SeedCard("灰色 (はいいろ)", "Màu xám"),
                            new SeedCard("金色 (きんいろ)", "Màu vàng kim")
                    )
            ),

            // ─── 7. Common verbs ────────────────────────────────
            new SeedDeck(
                    "JLPT N5 · 20 động từ thông dụng",
                    "Học động từ ở thể từ điển. Sẽ dùng cực kì nhiều trong giao tiếp hàng ngày.",
                    "ANKI", "ja", "vi", "Động từ", "Nghĩa",
                    List.of(
                            new SeedCard("食べる (たべる)", "Ăn"),
                            new SeedCard("飲む (のむ)", "Uống"),
                            new SeedCard("行く (いく)", "Đi"),
                            new SeedCard("来る (くる)", "Đến"),
                            new SeedCard("帰る (かえる)", "Về (nhà)"),
                            new SeedCard("見る (みる)", "Xem, nhìn"),
                            new SeedCard("聞く (きく)", "Nghe, hỏi"),
                            new SeedCard("読む (よむ)", "Đọc"),
                            new SeedCard("書く (かく)", "Viết"),
                            new SeedCard("話す (はなす)", "Nói chuyện"),
                            new SeedCard("買う (かう)", "Mua"),
                            new SeedCard("売る (うる)", "Bán"),
                            new SeedCard("作る (つくる)", "Làm, tạo ra"),
                            new SeedCard("する", "Làm (gì đó)"),
                            new SeedCard("勉強する (べんきょうする)", "Học (môn gì)"),
                            new SeedCard("起きる (おきる)", "Thức dậy"),
                            new SeedCard("寝る (ねる)", "Đi ngủ"),
                            new SeedCard("働く (はたらく)", "Làm việc"),
                            new SeedCard("休む (やすむ)", "Nghỉ ngơi"),
                            new SeedCard("会う (あう)", "Gặp gỡ")
                    )
            ),

            // ─── 8. Adjectives ──────────────────────────────────
            new SeedDeck(
                    "JLPT N5 · Tính từ thường gặp",
                    "Cả i-adjectives và na-adjectives. Cực kì cần thiết để mô tả mọi thứ.",
                    "QUIZLET", "ja", "vi", "Tiếng Nhật", "Nghĩa",
                    List.of(
                            new SeedCard("大きい (おおきい)", "Lớn, to"),
                            new SeedCard("小さい (ちいさい)", "Nhỏ"),
                            new SeedCard("新しい (あたらしい)", "Mới"),
                            new SeedCard("古い (ふるい)", "Cũ"),
                            new SeedCard("高い (たかい)", "Cao, đắt"),
                            new SeedCard("安い (やすい)", "Rẻ"),
                            new SeedCard("熱い (あつい)", "Nóng"),
                            new SeedCard("寒い (さむい)", "Lạnh (thời tiết)"),
                            new SeedCard("おいしい", "Ngon"),
                            new SeedCard("まずい", "Dở, không ngon"),
                            new SeedCard("きれい (na-adj)", "Đẹp, sạch sẽ"),
                            new SeedCard("元気 (げんき, na-adj)", "Khỏe mạnh"),
                            new SeedCard("有名 (ゆうめい, na-adj)", "Nổi tiếng"),
                            new SeedCard("静か (しずか, na-adj)", "Yên tĩnh")
                    )
            ),

            // ─── 9. Food & Restaurant ───────────────────────────
            new SeedDeck(
                    "Đồ ăn & Nhà hàng",
                    "Từ vựng cần biết khi đi ăn ở Nhật. Có cả tên món và cụm thường dùng.",
                    "QUIZLET", "ja", "vi", "Tiếng Nhật", "Nghĩa",
                    List.of(
                            new SeedCard("ご飯 (ごはん)", "Cơm"),
                            new SeedCard("パン", "Bánh mì"),
                            new SeedCard("肉 (にく)", "Thịt"),
                            new SeedCard("魚 (さかな)", "Cá"),
                            new SeedCard("野菜 (やさい)", "Rau"),
                            new SeedCard("果物 (くだもの)", "Hoa quả"),
                            new SeedCard("水 (みず)", "Nước"),
                            new SeedCard("お茶 (おちゃ)", "Trà"),
                            new SeedCard("コーヒー", "Cà phê"),
                            new SeedCard("ビール", "Bia"),
                            new SeedCard("寿司 (すし)", "Sushi"),
                            new SeedCard("ラーメン", "Mì ramen"),
                            new SeedCard("お弁当 (おべんとう)", "Cơm hộp bento"),
                            new SeedCard("メニューをください", "Cho tôi xem menu"),
                            new SeedCard("お会計お願いします", "Cho tôi thanh toán")
                    )
            ),

            // ─── 10. Body parts ─────────────────────────────────
            new SeedDeck(
                    "Bộ phận cơ thể",
                    "Các bộ phận chính trên cơ thể người. Hữu ích khi đi khám bệnh.",
                    "QUIZLET", "ja", "vi", "Tiếng Nhật", "Nghĩa",
                    List.of(
                            new SeedCard("頭 (あたま)", "Đầu"),
                            new SeedCard("顔 (かお)", "Mặt"),
                            new SeedCard("目 (め)", "Mắt"),
                            new SeedCard("耳 (みみ)", "Tai"),
                            new SeedCard("鼻 (はな)", "Mũi"),
                            new SeedCard("口 (くち)", "Miệng"),
                            new SeedCard("歯 (は)", "Răng"),
                            new SeedCard("首 (くび)", "Cổ"),
                            new SeedCard("肩 (かた)", "Vai"),
                            new SeedCard("手 (て)", "Tay"),
                            new SeedCard("足 (あし)", "Chân"),
                            new SeedCard("お腹 (おなか)", "Bụng")
                    )
            ),

            // ─── 11. Weather ────────────────────────────────────
            new SeedDeck(
                    "Thời tiết",
                    "Từ vựng và cụm từ về thời tiết. Người Nhật rất hay bắt chuyện về thời tiết.",
                    "QUIZLET", "ja", "vi", "Tiếng Nhật", "Nghĩa",
                    List.of(
                            new SeedCard("天気 (てんき)", "Thời tiết"),
                            new SeedCard("晴れ (はれ)", "Nắng, trời quang"),
                            new SeedCard("曇り (くもり)", "Trời nhiều mây"),
                            new SeedCard("雨 (あめ)", "Mưa"),
                            new SeedCard("雪 (ゆき)", "Tuyết"),
                            new SeedCard("風 (かぜ)", "Gió"),
                            new SeedCard("台風 (たいふう)", "Bão"),
                            new SeedCard("暑い (あつい)", "Nóng (thời tiết)"),
                            new SeedCard("涼しい (すずしい)", "Mát mẻ"),
                            new SeedCard("いい天気ですね", "Thời tiết đẹp nhỉ")
                    )
            ),

            // ─── 12. Travel phrases ─────────────────────────────
            new SeedDeck(
                    "Du lịch Nhật Bản · Câu thường dùng",
                    "Bộ câu cứu nguy khi đi du lịch — hỏi đường, mua vé, đặt phòng.",
                    "ANKI", "ja", "vi", "Câu", "Nghĩa",
                    List.of(
                            new SeedCard("これはいくらですか", "Cái này giá bao nhiêu?"),
                            new SeedCard("駅はどこですか", "Ga ở đâu?"),
                            new SeedCard("トイレはどこですか", "Nhà vệ sinh ở đâu?"),
                            new SeedCard("英語を話せますか", "Bạn nói tiếng Anh được không?"),
                            new SeedCard("もう一度お願いします", "Làm ơn nhắc lại lần nữa"),
                            new SeedCard("ゆっくり話してください", "Làm ơn nói chậm thôi"),
                            new SeedCard("わかりません", "Tôi không hiểu"),
                            new SeedCard("助けてください", "Xin hãy giúp tôi"),
                            new SeedCard("写真を撮ってもいいですか", "Tôi chụp ảnh được không?"),
                            new SeedCard("予約があります", "Tôi có đặt chỗ trước"),
                            new SeedCard("チェックインしたいです", "Tôi muốn nhận phòng"),
                            new SeedCard("Wi-Fi はありますか", "Có Wi-Fi không?")
                    )
            ),

            // ─── 13. Hiragana basics ────────────────────────────
            new SeedDeck(
                    "Hiragana · Hàng A đến N",
                    "Ôn lại bảng chữ cái Hiragana cơ bản. Học từng hàng một.",
                    "QUIZLET", "ja", "vi", "Hiragana", "Romaji",
                    List.of(
                            new SeedCard("あ", "a"),
                            new SeedCard("い", "i"),
                            new SeedCard("う", "u"),
                            new SeedCard("え", "e"),
                            new SeedCard("お", "o"),
                            new SeedCard("か", "ka"),
                            new SeedCard("き", "ki"),
                            new SeedCard("く", "ku"),
                            new SeedCard("け", "ke"),
                            new SeedCard("こ", "ko"),
                            new SeedCard("さ", "sa"),
                            new SeedCard("し", "shi"),
                            new SeedCard("す", "su"),
                            new SeedCard("せ", "se"),
                            new SeedCard("そ", "so"),
                            new SeedCard("た", "ta"),
                            new SeedCard("ち", "chi"),
                            new SeedCard("つ", "tsu"),
                            new SeedCard("て", "te"),
                            new SeedCard("と", "to"),
                            new SeedCard("な", "na"),
                            new SeedCard("に", "ni"),
                            new SeedCard("ぬ", "nu"),
                            new SeedCard("ね", "ne"),
                            new SeedCard("の", "no"),
                            new SeedCard("ん", "n")
                    )
            ),

            // ─── 14. Question words ─────────────────────────────
            new SeedDeck(
                    "Từ để hỏi (5W1H)",
                    "Bộ từ để hỏi quan trọng nhất tiếng Nhật. Học một lần dùng cả đời.",
                    "QUIZLET", "ja", "vi", "Tiếng Nhật", "Nghĩa",
                    List.of(
                            new SeedCard("何 (なに / なん)", "Gì? (what)"),
                            new SeedCard("誰 (だれ)", "Ai? (who)"),
                            new SeedCard("どこ", "Ở đâu? (where)"),
                            new SeedCard("いつ", "Khi nào? (when)"),
                            new SeedCard("なぜ / どうして", "Tại sao? (why)"),
                            new SeedCard("どう / どうやって", "Như thế nào? (how)"),
                            new SeedCard("いくら", "Bao nhiêu tiền?"),
                            new SeedCard("どれ", "Cái nào? (which)"),
                            new SeedCard("どんな", "Như thế nào? (what kind)")
                    )
            ),

            // ─── 15. Time expressions ───────────────────────────
            new SeedDeck(
                    "JLPT N5 · Diễn đạt thời gian",
                    "Cách nói giờ, ngày, hôm qua/nay/mai trong tiếng Nhật.",
                    "ANKI", "ja", "vi", "Tiếng Nhật", "Nghĩa",
                    List.of(
                            new SeedCard("今 (いま)", "Bây giờ"),
                            new SeedCard("今日 (きょう)", "Hôm nay"),
                            new SeedCard("昨日 (きのう)", "Hôm qua"),
                            new SeedCard("明日 (あした)", "Ngày mai"),
                            new SeedCard("今週 (こんしゅう)", "Tuần này"),
                            new SeedCard("先週 (せんしゅう)", "Tuần trước"),
                            new SeedCard("来週 (らいしゅう)", "Tuần sau"),
                            new SeedCard("今月 (こんげつ)", "Tháng này"),
                            new SeedCard("先月 (せんげつ)", "Tháng trước"),
                            new SeedCard("来月 (らいげつ)", "Tháng sau"),
                            new SeedCard("今年 (ことし)", "Năm nay"),
                            new SeedCard("去年 (きょねん)", "Năm ngoái"),
                            new SeedCard("来年 (らいねん)", "Năm sau"),
                            new SeedCard("朝 (あさ)", "Buổi sáng"),
                            new SeedCard("昼 (ひる)", "Buổi trưa"),
                            new SeedCard("夜 (よる)", "Buổi tối")
                    )
            )
    );
}
