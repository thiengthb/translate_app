package com.example.starter_project_2025.init;

import com.example.starter_project_2025.system.reading.passage.ReadingPassage;
import com.example.starter_project_2025.system.reading.passage.ReadingPassageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Seed sẵn 20 bài đọc hiểu tiếng Nhật (N5→N2) cho tính năng Đọc hiểu (/reader),
 * để học viên có nội dung đọc ngay lần đầu app khởi động.
 *
 * <p>Mỗi bài được gắn một <b>chủ đề</b> kiểu chuyên mục báo (Đời sống, Tự nhiên
 * & Môi trường, Xã hội & Pháp luật, Khoa học & Công nghệ, Văn hóa, Sức khỏe) để
 * học viên lọc bài theo mối quan tâm.
 *
 * <p>Idempotent theo <b>tiêu đề</b>: chỉ chèn bài nào chưa tồn tại trong DB. Nhờ
 * vậy 2 bài đã có sẵn (tạo qua ProTable) không bị ảnh hưởng, và mỗi lần restart
 * sẽ không nhân đôi dữ liệu.
 */
@Slf4j
@Order(14)
@Component
@RequiredArgsConstructor
public class ReadingPassageDataInitializer implements CommandLineRunner {

    private final ReadingPassageRepository readingPassageRepository;

    /** title | level | category | content (JA) | summary (VI) */
    private record SeedPassage(String title, String level, String category, String content, String summary) {}

    private static final List<SeedPassage> SEED_PASSAGES = List.of(
            // ── N5 ───────────────────────────────────────────────────────────────
            new SeedPassage("わたしの一日", "N5", "Đời sống",
                    "わたしは毎朝六時に起きます。顔を洗ってから、朝ご飯を食べます。"
                            + "朝ご飯はいつもパンとコーヒーです。七時半に家を出て、電車で学校へ行きます。"
                            + "学校は九時に始まります。午後四時に授業が終わります。"
                            + "家に帰ってから、宿題をします。夜十一時ごろ寝ます。",
                    "Bài đọc N5 kể về một ngày bình thường của người viết: thức dậy, ăn sáng, đi học bằng tàu điện và về nhà làm bài tập."),

            new SeedPassage("わたしの家族", "N5", "Đời sống",
                    "わたしの家族は四人です。父と母と妹とわたしです。"
                            + "父は会社員で、毎日忙しいです。母は料理が上手です。"
                            + "妹はまだ小学生で、サッカーが大好きです。"
                            + "週末はいつも家族みんなで公園へ行きます。とても楽しいです。",
                    "Giới thiệu về gia đình bốn người: bố là nhân viên công ty, mẹ nấu ăn giỏi, em gái còn học tiểu học. Cuối tuần cả nhà đi công viên."),

            new SeedPassage("週末の予定", "N5", "Đời sống",
                    "今週の土曜日に友達と買い物に行きます。新しいかばんがほしいです。"
                            + "デパートでお昼ご飯を食べてから、映画を見ます。"
                            + "日曜日は家でゆっくり休みます。部屋を掃除して、それから本を読みます。"
                            + "天気がよかったら、散歩にも行きたいです。",
                    "Kế hoạch cuối tuần: thứ Bảy đi mua sắm và xem phim với bạn, Chủ nhật nghỉ ngơi ở nhà, dọn phòng và đọc sách."),

            new SeedPassage("好きな食べ物", "N5", "Sức khỏe",
                    "わたしは寿司が一番好きです。とくにまぐろが好きです。"
                            + "日本へ行ったとき、毎日寿司を食べました。とてもおいしかったです。"
                            + "ラーメンも好きですが、少しカロリーが高いです。"
                            + "野菜もたくさん食べるようにしています。健康が大切ですから。",
                    "Người viết thích sushi nhất, đặc biệt là cá ngừ, cũng thích mì ramen nhưng cố ăn nhiều rau để giữ sức khỏe."),

            new SeedPassage("わたしの町", "N5", "Đời sống",
                    "わたしの町は小さいですが、とても静かです。駅の近くにスーパーと病院があります。"
                            + "公園も大きくて、子供たちがよく遊んでいます。"
                            + "町の人はみんな親切です。困ったとき、すぐに助けてくれます。"
                            + "わたしはこの町が大好きです。",
                    "Mô tả thị trấn nhỏ nhưng yên tĩnh của người viết: gần ga có siêu thị và bệnh viện, công viên rộng, người dân thân thiện."),

            new SeedPassage("日本語の勉強", "N5", "Văn hóa",
                    "わたしは去年から日本語を勉強しています。最初はひらがなも読めませんでした。"
                            + "毎日少しずつ漢字を覚えています。今は簡単な文章が読めます。"
                            + "日本のアニメを見ることが好きで、それで言葉を覚えます。"
                            + "いつか日本人と上手に話したいです。",
                    "Hành trình học tiếng Nhật từ năm ngoái: ban đầu chưa đọc được hiragana, nay đã đọc được câu đơn giản nhờ xem anime."),

            new SeedPassage("夏休みの思い出", "N5", "Đời sống",
                    "去年の夏休みに、家族と海へ行きました。天気がとてもよかったです。"
                            + "海で泳いだり、砂で山を作ったりしました。"
                            + "お昼にはおいしい魚料理を食べました。"
                            + "夜は花火を見ました。本当に楽しい夏休みでした。",
                    "Kỷ niệm kỳ nghỉ hè năm ngoái đi biển cùng gia đình: bơi, xây núi cát, ăn cá và xem pháo hoa buổi tối."),

            // ── N4 ───────────────────────────────────────────────────────────────
            new SeedPassage("電車の中のマナー", "N4", "Xã hội & Pháp luật",
                    "日本の電車の中では、静かにするのがマナーです。大きな声で話したり、"
                            + "電話をしたりするのはよくないと言われています。"
                            + "また、お年寄りや体の不自由な人がいたら、席をゆずるのが普通です。"
                            + "みんなが気持ちよく乗れるように、一人ひとりが気をつけることが大切です。",
                    "Quy tắc ứng xử trên tàu điện ở Nhật: giữ yên lặng, không nói to hay gọi điện, nhường ghế cho người già và người khuyết tật."),

            new SeedPassage("コンビニの便利さ", "N4", "Đời sống",
                    "日本のコンビニは二十四時間開いていて、とても便利です。"
                            + "食べ物や飲み物だけでなく、雑誌や日用品も買えます。"
                            + "さらに、公共料金の支払いや荷物の受け取りもできます。"
                            + "最近は、温かい食事や入れたてのコーヒーも人気があります。"
                            + "コンビニは私たちの生活になくてはならない存在になっています。",
                    "Sự tiện lợi của cửa hàng tiện lợi ở Nhật: mở 24 giờ, bán đồ ăn thức uống, đồ dùng, còn thanh toán hóa đơn và nhận hàng."),

            new SeedPassage("趣味と健康", "N4", "Sức khỏe",
                    "私の趣味は山登りです。週末になると、よく近くの山に登ります。"
                            + "山の上から見る景色は本当にすばらしいです。"
                            + "山登りを始めてから、体が丈夫になり、あまり風邪をひかなくなりました。"
                            + "運動は健康にいいだけでなく、ストレスをなくす効果もあると思います。",
                    "Sở thích leo núi vào cuối tuần giúp người viết khỏe hơn, ít cảm cúm; vận động vừa tốt cho sức khỏe vừa giảm căng thẳng."),

            new SeedPassage("日本の四季", "N4", "Tự nhiên & Môi trường",
                    "日本には春、夏、秋、冬の四つの季節があります。"
                            + "春は桜が咲いて、多くの人が花見を楽しみます。"
                            + "夏は暑くて、海や祭りへ行く人が多いです。"
                            + "秋は涼しくなり、紅葉がとてもきれいです。"
                            + "冬は寒く、北のほうでは雪がたくさん降ります。"
                            + "季節によって景色や食べ物が変わるのが日本の魅力です。",
                    "Bốn mùa ở Nhật: xuân ngắm hoa anh đào, hè đi biển và lễ hội, thu ngắm lá đỏ, đông tuyết rơi ở miền Bắc."),

            new SeedPassage("アルバイトの経験", "N4", "Đời sống",
                    "私は大学生のとき、レストランでアルバイトをしていました。"
                            + "最初は注文を覚えるのが大変で、よく失敗しました。"
                            + "でも、店長や先輩がいろいろ教えてくれました。"
                            + "お客さんに「ありがとう」と言われたとき、とてもうれしかったです。"
                            + "このアルバイトで、働くことの大切さを学びました。",
                    "Trải nghiệm làm thêm ở nhà hàng thời sinh viên: ban đầu hay sai sót nhưng được dạy dỗ, học được giá trị của lao động."),

            new SeedPassage("手紙とメール", "N4", "Khoa học & Công nghệ",
                    "昔は遠くの人に気持ちを伝えるとき、手紙を書きました。"
                            + "手紙は届くまで時間がかかりますが、心がこもっていると感じます。"
                            + "今はメールやメッセージですぐに連絡できるようになりました。"
                            + "便利になった一方で、ゆっくり言葉を選ぶ時間が減ったかもしれません。"
                            + "時には手書きの手紙も書いてみたいものです。",
                    "So sánh thư tay và email: thư tay mất thời gian nhưng chứa đựng tình cảm, còn email nhanh tiện nhưng ít thời gian chọn lời."),

            // ── N3 ───────────────────────────────────────────────────────────────
            new SeedPassage("ゴミの分別", "N3", "Tự nhiên & Môi trường",
                    "日本では、ゴミを正しく分別することが求められています。"
                            + "燃えるゴミ、燃えないゴミ、資源ゴミなど、地域によって細かいルールが決められています。"
                            + "最初は面倒だと感じる人も多いですが、分別はリサイクルを進め、環境を守るために欠かせません。"
                            + "一人ひとりの小さな行動が、未来の地球を守ることにつながっているのです。",
                    "Phân loại rác ở Nhật: rác cháy được, không cháy được, rác tái chế theo quy định từng vùng — hành động nhỏ góp phần bảo vệ môi trường."),

            new SeedPassage("働き方の変化", "N3", "Xã hội & Pháp luật",
                    "近年、日本では働き方が大きく変わってきました。"
                            + "以前は会社で長時間働くことが当たり前でしたが、最近は在宅勤務を選ぶ人が増えています。"
                            + "家で働くと通勤の時間がなくなり、家族と過ごす時間が増えるという利点があります。"
                            + "しかし、仕事と生活の区別がつきにくくなるという問題も指摘されています。"
                            + "それぞれに合った働き方を見つけることが大切でしょう。",
                    "Sự thay đổi cách làm việc ở Nhật: làm việc tại nhà tăng lên, có lợi là tiết kiệm thời gian nhưng khó tách bạch công việc và đời sống."),

            new SeedPassage("読書のすすめ", "N3", "Văn hóa",
                    "本を読むことには、たくさんの良い点があります。"
                            + "本を通して、自分が経験したことのない世界を知ることができます。"
                            + "また、いろいろな考え方に触れることで、物事を広い視野で見られるようになります。"
                            + "スマートフォンで短い情報を読むことが増えた今だからこそ、"
                            + "じっくり一冊の本と向き合う時間を持つことが大切だと思います。",
                    "Khuyến khích đọc sách: giúp biết những thế giới chưa từng trải, mở rộng tầm nhìn — đặc biệt quan trọng trong thời đại đọc thông tin ngắn trên điện thoại."),

            new SeedPassage("外国語を学ぶ意味", "N3", "Văn hóa",
                    "外国語を学ぶことは、単に言葉を覚えるだけではありません。"
                            + "その国の文化や考え方を理解することにもつながります。"
                            + "言葉が話せるようになると、世界中の人と直接話すことができ、新しい友達もできます。"
                            + "間違えることを恐れずに、たくさん話すことが上達の近道です。"
                            + "学んだ言葉は、きっと一生の財産になるでしょう。",
                    "Ý nghĩa của việc học ngoại ngữ: không chỉ nhớ từ mà còn hiểu văn hóa, kết bạn khắp thế giới; đừng sợ sai, nói nhiều là cách tiến bộ."),

            new SeedPassage("食べ物を大切に", "N3", "Tự nhiên & Môi trường",
                    "世界では今、たくさんの食べ物が捨てられているという問題があります。"
                            + "まだ食べられるのに、見た目が悪いという理由で捨てられることも少なくありません。"
                            + "一方で、食べ物が足りずに困っている人々も大勢います。"
                            + "買いすぎないこと、残さず食べることなど、私たちにできることはたくさんあります。"
                            + "食べ物を大切にする心を忘れないようにしたいものです。",
                    "Vấn đề lãng phí thực phẩm: nhiều đồ ăn còn dùng được bị bỏ đi trong khi nhiều người thiếu ăn — đừng mua thừa, đừng bỏ phí."),

            // ── N2 ───────────────────────────────────────────────────────────────
            new SeedPassage("少子高齢化の課題", "N2", "Xã hội & Pháp luật",
                    "日本は今、少子高齢化という大きな課題に直面している。"
                            + "子どもの数が減り続ける一方で、高齢者の割合は年々増加している。"
                            + "その結果、働く世代が高齢者を支える負担が重くなり、年金や医療の制度にも影響が出ている。"
                            + "この問題を解決するためには、子育てしやすい環境づくりや、高齢者が活躍できる仕組みなど、"
                            + "社会全体で取り組む必要があるだろう。",
                    "Bài N2 về già hóa dân số ở Nhật: trẻ em giảm, người già tăng, gánh nặng lên thế hệ lao động và hệ thống lương hưu, y tế — cần cả xã hội chung tay."),

            new SeedPassage("情報社会と向き合う", "N2", "Khoa học & Công nghệ",
                    "インターネットの発達により、私たちは膨大な情報を簡単に手に入れられるようになった。"
                            + "しかし、その中には正しくない情報も数多く含まれている。"
                            + "受け取った情報をそのまま信じるのではなく、本当に正しいかどうかを自分で考え、"
                            + "確かめる姿勢がますます重要になっている。"
                            + "情報をうまく使いこなす力こそ、これからの時代に求められる能力だと言える。",
                    "Bài N2 về xã hội thông tin: internet cho tiếp cận lượng lớn thông tin nhưng nhiều cái sai — cần tự suy nghĩ, kiểm chứng; năng lực dùng thông tin là kỹ năng thời đại mới."),

            // ── Bổ sung theo chủ đề ───────────────────────────────────────────────
            // Đời sống
            new SeedPassage("ペットとの暮らし", "N4", "Đời sống",
                    "私は三年前から犬を飼っています。名前はモモで、とても元気な犬です。"
                            + "毎朝、散歩に連れて行くのが私の日課です。"
                            + "ペットがいると、家の中が明るくなり、さびしくありません。"
                            + "世話は大変なこともありますが、モモは私の大切な家族の一員です。",
                    "Cuộc sống cùng thú cưng: nuôi chú chó tên Momo ba năm nay, mỗi sáng dắt đi dạo; có thú cưng nhà cửa vui hơn, là một thành viên trong gia đình."),

            new SeedPassage("一人暮らしの工夫", "N3", "Đời sống",
                    "大学に入って、初めて一人暮らしを始めた。"
                            + "最初は料理も掃除も自分でやらなければならず、大変だった。"
                            + "しかし、少しずつ慣れてくると、自分のペースで生活できる楽しさが分かってきた。"
                            + "時間やお金の使い方を考えるようになり、自立する力が身についたと思う。",
                    "Sống tự lập: lần đầu sống một mình khi vào đại học, ban đầu vất vả với nấu ăn dọn dẹp nhưng dần quen, học được cách quản lý thời gian, tiền bạc và trưởng thành hơn."),

            // Văn hóa
            new SeedPassage("日本のお祭り", "N4", "Văn hóa",
                    "日本では一年を通して、各地でたくさんのお祭りが行われます。"
                            + "夏には浴衣を着て、花火大会や盆踊りを楽しむ人が多いです。"
                            + "お祭りでは、屋台でたこ焼きやかき氷などを買うこともできます。"
                            + "地域の伝統を守りながら、みんなで楽しむお祭りは日本の大切な文化です。",
                    "Lễ hội Nhật Bản: quanh năm khắp nơi có lễ hội, mùa hè mặc yukata xem pháo hoa, nhảy bon-odori, ăn quà ở quầy hàng — nét văn hóa gìn giữ truyền thống."),

            new SeedPassage("茶道の心", "N2", "Văn hóa",
                    "茶道は、ただお茶を飲むためのものではない。"
                            + "お客さんをもてなす心と、相手を思いやる気持ちが大切にされている。"
                            + "一つ一つの動作には意味があり、静かな時間の中で心を落ち着かせる。"
                            + "忙しい現代だからこそ、こうした伝統の中にある「おもてなし」の精神を見直したい。",
                    "Tinh thần trà đạo: không chỉ là uống trà mà là tấm lòng tiếp đãi và quan tâm tới khách; mỗi động tác đều có ý nghĩa, giúp tĩnh tâm — đáng suy ngẫm trong thời hiện đại bận rộn."),

            // Xã hội & Pháp luật
            new SeedPassage("ルールを守る大切さ", "N4", "Xã hội & Pháp luật",
                    "私たちの社会には、たくさんのルールがあります。"
                            + "信号を守ることや、ゴミを決められた場所に捨てることもその一つです。"
                            + "ルールは、みんなが安全で気持ちよく暮らすために作られています。"
                            + "一人ひとりがルールを守ることで、社会はもっと住みやすくなります。",
                    "Tầm quan trọng của việc tuân thủ quy tắc: chấp hành đèn tín hiệu, bỏ rác đúng nơi; quy tắc lập ra để mọi người sống an toàn, dễ chịu hơn."),

            new SeedPassage("ボランティア活動", "N3", "Xã hội & Pháp luật",
                    "最近、ボランティア活動に参加する人が増えている。"
                            + "災害が起きたときに被害にあった人を助けたり、町の清掃をしたりと、活動はさまざまだ。"
                            + "報酬はないが、人の役に立つことで大きな喜びを感じられる。"
                            + "社会全体で助け合う気持ちを持つことが、これからますます求められるだろう。",
                    "Hoạt động tình nguyện: ngày càng nhiều người tham gia — giúp người gặp thiên tai, dọn dẹp phố phường; tuy không công nhưng đem lại niềm vui giúp đời, tinh thần tương trợ ngày càng cần thiết."),

            // Tự nhiên & Môi trường
            new SeedPassage("水を大切に", "N4", "Tự nhiên & Môi trường",
                    "水は私たちの生活になくてはならないものです。"
                            + "料理や洗濯、お風呂など、毎日たくさんの水を使っています。"
                            + "しかし、世界には安全な水が飲めない人々もたくさんいます。"
                            + "歯をみがくときに水を止めるなど、小さなことから水を大切に使いましょう。",
                    "Hãy tiết kiệm nước: nước thiết yếu cho nấu ăn, giặt giũ, tắm rửa; nhưng nhiều nơi trên thế giới thiếu nước sạch — hãy tiết kiệm từ việc nhỏ như khóa vòi khi đánh răng."),

            new SeedPassage("地球温暖化を考える", "N2", "Tự nhiên & Môi trường",
                    "近年、地球の平均気温が少しずつ上がっていると言われている。"
                            + "その原因の一つは、車や工場から出る二酸化炭素だと考えられている。"
                            + "気温が上がると、強い台風が増えたり、海面が上がったりする恐れがある。"
                            + "電気を無駄に使わないなど、私たちにできることから始めることが大切だ。",
                    "Suy ngẫm về nóng lên toàn cầu: nhiệt độ trái đất tăng dần, một nguyên nhân là CO2 từ xe cộ và nhà máy; gây bão mạnh, nước biển dâng — hãy bắt đầu từ việc không lãng phí điện."),

            // Sức khỏe
            new SeedPassage("早寝早起き", "N5", "Sức khỏe",
                    "健康のためには、早く寝て早く起きることが大切です。"
                            + "夜遅くまでスマートフォンを見ていると、よく眠れません。"
                            + "朝早く起きると、気持ちがよくて、一日を元気に過ごせます。"
                            + "毎日同じ時間に寝て、同じ時間に起きるようにしましょう。",
                    "Ngủ sớm dậy sớm: tốt cho sức khỏe; xem điện thoại khuya khó ngủ ngon; dậy sớm thấy sảng khoái, cả ngày khỏe khoắn — hãy ngủ và dậy đúng giờ mỗi ngày."),

            new SeedPassage("朝ごはんの大切さ", "N4", "Sức khỏe",
                    "朝ごはんは一日の元気のもとです。"
                            + "朝、何も食べないと、頭がうまく働かず、集中できません。"
                            + "ごはんやパンだけでなく、野菜やたまごも食べると、栄養のバランスがよくなります。"
                            + "忙しくても、朝ごはんをしっかり食べる習慣をつけたいですね。",
                    "Tầm quan trọng của bữa sáng: là nguồn năng lượng cả ngày; nhịn sáng khiến đầu óc kém minh mẫn, khó tập trung; nên ăn thêm rau, trứng để cân bằng dinh dưỡng."),

            // Khoa học & Công nghệ
            new SeedPassage("スマートフォンの使い方", "N4", "Khoa học & Công nghệ",
                    "今、ほとんどの人がスマートフォンを使っています。"
                            + "調べ物をしたり、友達と連絡したり、とても便利な道具です。"
                            + "しかし、長い時間使いすぎると、目が疲れたり、勉強の時間が減ったりします。"
                            + "便利な道具だからこそ、使う時間を決めて、上手に付き合うことが大切です。",
                    "Cách dùng điện thoại thông minh: rất tiện để tra cứu, liên lạc; nhưng dùng quá lâu sẽ mỏi mắt, mất thời gian học — nên đặt giới hạn thời gian, dùng cho khéo."),

            new SeedPassage("ロボットと暮らす未来", "N3", "Khoa học & Công nghệ",
                    "近年、ロボットの技術が大きく進歩している。"
                            + "工場で働くロボットだけでなく、家の掃除をするロボットも増えてきた。"
                            + "将来は、病院や介護の場でロボットが人を助けるようになるだろう。"
                            + "便利になる一方で、人にしかできない仕事の大切さも忘れてはならない。",
                    "Tương lai sống cùng robot: công nghệ robot tiến bộ — không chỉ trong nhà máy mà cả robot dọn nhà; tương lai sẽ hỗ trợ ở bệnh viện, chăm sóc; nhưng đừng quên giá trị những việc chỉ con người làm được."),

            // ── Mở rộng: thêm 5 bài cho mỗi chủ đề ────────────────────────────────
            // Đời sống
            new SeedPassage("コンビニのおにぎり", "N5", "Đời sống",
                    "わたしは毎日コンビニでおにぎりを買います。値段が安くて、種類も多いです。"
                            + "いちばん好きなのはツナマヨです。朝ごはんによく食べます。"
                            + "温めてもらうと、もっとおいしくなります。"
                            + "忙しい朝には、本当に助かります。",
                    "Cơm nắm tiện lợi: ngày nào cũng mua onigiri ở cửa hàng tiện lợi vì rẻ và nhiều loại; thích nhất vị cá ngừ sốt mayonnaise, hâm nóng càng ngon — cứu cánh cho buổi sáng bận rộn."),

            new SeedPassage("引っ越しの日", "N4", "Đời sống",
                    "先週、新しいアパートに引っ越しました。前の部屋より広くて、日当たりもいいです。"
                            + "荷物を運ぶのは大変でしたが、友達が手伝ってくれました。"
                            + "夜は、みんなでピザを食べてお祝いしました。"
                            + "早く新しい生活に慣れたいです。",
                    "Ngày chuyển nhà: tuần trước dọn sang căn hộ mới rộng và nhiều nắng hơn; chuyển đồ vất vả nhưng có bạn giúp, tối cả nhóm ăn pizza ăn mừng."),

            new SeedPassage("家計簿をつける", "N3", "Đời sống",
                    "社会人になってから、毎月家計簿をつけるようにしている。"
                            + "何にお金を使ったかを記録すると、無駄な買い物に気づくことができる。"
                            + "最初は面倒だったが、続けるうちに貯金が少しずつ増えてきた。"
                            + "お金の管理は、自分の生活を見直すいい機会になる。",
                    "Ghi sổ chi tiêu: từ khi đi làm tập ghi chép mỗi tháng, nhận ra các khoản mua phí; tuy phiền lúc đầu nhưng dần để dành được — là dịp nhìn lại cuộc sống."),

            new SeedPassage("近所付き合い", "N3", "Đời sống",
                    "私の住んでいる地域では、近所の人との付き合いを大切にしている。"
                            + "朝、道で会ったときは、必ず「おはようございます」とあいさつをする。"
                            + "困ったことがあれば、お互いに助け合うこともある。"
                            + "こうしたつながりが、安心して暮らせる町をつくっていると思う。",
                    "Quan hệ hàng xóm: nơi tôi ở coi trọng tình làng xóm, gặp nhau buổi sáng đều chào hỏi, có khó khăn thì giúp nhau — chính sự gắn kết ấy tạo nên khu phố an tâm."),

            new SeedPassage("休日の過ごし方", "N4", "Đời sống",
                    "人によって、休日の過ごし方はさまざまです。"
                            + "家でゆっくり映画を見る人もいれば、外に出て運動する人もいます。"
                            + "私は、午前中に掃除や洗濯をして、午後はカフェで本を読むのが好きです。"
                            + "自分に合った過ごし方を見つけると、心も体も元気になります。",
                    "Cách tận hưởng ngày nghỉ: mỗi người mỗi khác — người xem phim ở nhà, người ra ngoài vận động; tôi thích sáng dọn dẹp giặt giũ, chiều đọc sách ở quán cà phê."),

            // Tự nhiên & Môi trường
            new SeedPassage("庭の花", "N5", "Tự nhiên & Môi trường",
                    "わたしの家には小さな庭があります。母は花を育てるのが好きです。"
                            + "春にはチューリップ、夏にはひまわりが咲きます。"
                            + "毎朝、水をやるのがわたしの仕事です。"
                            + "花がきれいに咲くと、とてもうれしいです。",
                    "Hoa trong vườn: nhà có khu vườn nhỏ, mẹ thích trồng hoa — xuân có tulip, hè có hướng dương; mỗi sáng tôi tưới nước, hoa nở đẹp thấy rất vui."),

            new SeedPassage("リサイクルの取り組み", "N4", "Tự nhiên & Môi trường",
                    "私たちの学校では、リサイクルに力を入れています。"
                            + "使い終わった紙やペットボトルは、決められた箱に集めます。"
                            + "集めたものは、新しい製品に作り変えられます。"
                            + "ものを大切にする心を、子どものうちから身につけることが大切です。",
                    "Hoạt động tái chế: trường chú trọng tái chế — giấy và chai nhựa đã dùng gom vào hộp riêng để làm thành sản phẩm mới; nuôi ý thức trân trọng đồ vật từ nhỏ."),

            new SeedPassage("森を守る", "N3", "Tự nhiên & Môi trường",
                    "森は、たくさんの動物や植物がくらす大切な場所だ。"
                            + "木は、私たちが必要とする酸素を作り出してくれる。"
                            + "しかし、世界では今も多くの森が切り倒されている。"
                            + "植林などの活動を通して、未来のために森を守っていく必要がある。",
                    "Bảo vệ rừng: rừng là nơi sống của nhiều động thực vật, cây tạo ra oxy ta cần; nhưng nhiều rừng vẫn bị chặt phá — cần trồng cây để giữ rừng cho tương lai."),

            new SeedPassage("海の汚れ", "N3", "Tự nhiên & Môi trường",
                    "近年、海のプラスチックごみが大きな問題になっている。"
                            + "捨てられたごみが川を流れ、やがて海にたどり着く。"
                            + "魚や海の生き物がそれを食べてしまうこともある。"
                            + "買い物にエコバッグを使うなど、小さな工夫から始めたい。",
                    "Ô nhiễm biển: rác nhựa trên biển thành vấn đề lớn — rác trôi theo sông ra biển, sinh vật biển ăn phải; hãy bắt đầu từ việc nhỏ như dùng túi vải đi chợ."),

            new SeedPassage("自然エネルギー", "N2", "Tự nhiên & Môi trường",
                    "太陽や風を利用した自然エネルギーが注目を集めている。"
                            + "石油や石炭とちがい、使ってもなくならず、環境を汚しにくい。"
                            + "ただし、天気によって発電量が変わるという課題もある。"
                            + "これからの社会では、こうしたエネルギーをどう生かすかが問われている。",
                    "Năng lượng tự nhiên: điện mặt trời, điện gió được chú ý — khác dầu than, dùng không cạn và ít gây ô nhiễm; nhưng sản lượng phụ thuộc thời tiết, bài toán là tận dụng sao cho hiệu quả."),

            // Xã hội & Pháp luật
            new SeedPassage("あいさつの大切さ", "N5", "Xã hội & Pháp luật",
                    "あいさつは、人と人をつなぐ大切なものです。"
                            + "朝は「おはよう」、別れるときは「さようなら」と言います。"
                            + "あいさつをすると、お互いに気持ちがよくなります。"
                            + "小さなことですが、毎日続けたいです。",
                    "Tầm quan trọng của lời chào: lời chào kết nối con người — sáng nói 'ohayou', chia tay nói 'sayounara'; chào nhau khiến cả hai dễ chịu, việc nhỏ nhưng nên duy trì."),

            new SeedPassage("交通ルールを守ろう", "N4", "Xã hội & Pháp luật",
                    "道路を安全に使うために、交通ルールがあります。"
                            + "信号が赤のときは、止まらなければなりません。"
                            + "自転車に乗るときも、ルールを守ることが大切です。"
                            + "一人ひとりが気をつければ、事故を減らすことができます。",
                    "Hãy tuân thủ luật giao thông: luật giúp dùng đường an toàn — đèn đỏ phải dừng, đi xe đạp cũng phải theo luật; mỗi người cẩn thận sẽ giảm tai nạn."),

            new SeedPassage("選挙に行こう", "N3", "Xã hội & Pháp luật",
                    "選挙は、自分たちの代表を選ぶ大切な機会だ。"
                            + "私たちの一票が、これからの社会のあり方を決めることになる。"
                            + "若い人の投票率が低いことが、よく問題になっている。"
                            + "政治を他人事と考えず、自分のこととして関心を持ちたい。",
                    "Hãy đi bầu cử: bầu cử là dịp chọn người đại diện, mỗi lá phiếu quyết định xã hội tương lai; tỷ lệ giới trẻ đi bầu thấp là vấn đề — đừng coi chính trị là chuyện người khác."),

            new SeedPassage("税金の役割", "N2", "Xã hội & Pháp luật",
                    "私たちが納める税金は、社会のさまざまな場面で使われている。"
                            + "道路や学校、病院などは、税金によって支えられている。"
                            + "税金がなければ、安心して暮らせる社会は成り立たない。"
                            + "何にどう使われているかを知ることも、市民の大切な役割だ。",
                    "Vai trò của thuế: thuế ta nộp được dùng khắp xã hội — đường sá, trường học, bệnh viện đều nhờ thuế; không có thuế khó có xã hội an tâm, hiểu thuế dùng vào đâu cũng là trách nhiệm công dân."),

            new SeedPassage("みんなで使う場所", "N4", "Xã hội & Pháp luật",
                    "公園や図書館は、みんなで使う場所です。"
                            + "だから、ほかの人のことも考えて使わなければなりません。"
                            + "大きな声を出したり、ごみを散らかしたりしてはいけません。"
                            + "きれいに使えば、誰もが気持ちよく過ごせます。",
                    "Nơi dùng chung: công viên, thư viện là chỗ mọi người dùng nên phải nghĩ cho người khác — không nói to, không xả rác; giữ sạch thì ai cũng thoải mái."),

            // Khoa học & Công nghệ
            new SeedPassage("電子マネー", "N4", "Khoa học & Công nghệ",
                    "最近、買い物のときに電子マネーを使う人が増えています。"
                            + "スマートフォンやカードで、すぐに支払いができて便利です。"
                            + "お金を数える必要がなく、時間も短くてすみます。"
                            + "ただし、使いすぎないように気をつけることも大切です。",
                    "Tiền điện tử: ngày càng nhiều người thanh toán bằng tiền điện tử qua điện thoại hay thẻ — nhanh tiện, khỏi đếm tiền; nhưng cần cẩn thận kẻo tiêu quá tay."),

            new SeedPassage("インターネットの便利さ", "N4", "Khoa học & Công nghệ",
                    "インターネットのおかげで、生活はとても便利になりました。"
                            + "家にいながら、買い物をしたり、世界中のニュースを読んだりできます。"
                            + "遠くにいる友達とも、すぐに話すことができます。"
                            + "上手に使えば、私たちの世界はもっと広がります。",
                    "Sự tiện lợi của internet: cuộc sống tiện hơn nhiều — ở nhà vẫn mua sắm, đọc tin thế giới, nói chuyện ngay với bạn ở xa; dùng khéo thì thế giới rộng mở hơn."),

            new SeedPassage("AIと私たちの生活", "N3", "Khoa học & Công nghệ",
                    "近年、AIという言葉をよく聞くようになった。"
                            + "AIは、車の運転や病気の発見など、さまざまな場面で使われ始めている。"
                            + "人間の仕事を助けてくれる一方で、仕事が減るのではという心配もある。"
                            + "技術とどう付き合っていくか、私たちが考えていく必要がある。",
                    "AI và cuộc sống: gần đây hay nghe từ AI — đã dùng trong lái xe, phát hiện bệnh; vừa hỗ trợ con người vừa khiến lo mất việc; cần suy nghĩ cách chung sống với công nghệ."),

            new SeedPassage("宇宙への挑戦", "N3", "Khoa học & Công nghệ",
                    "人類は昔から、宇宙にあこがれてきた。"
                            + "今では、ロケットで人を宇宙へ送ることができるようになった。"
                            + "将来は、ふつうの人も宇宙旅行を楽しめる時代が来るかもしれない。"
                            + "宇宙の研究は、地球の未来を考えることにもつながっている。",
                    "Thử thách chinh phục vũ trụ: con người luôn khao khát vũ trụ, nay đã đưa người lên bằng tên lửa; tương lai có thể du lịch vũ trụ; nghiên cứu vũ trụ cũng là nghĩ về tương lai trái đất."),

            new SeedPassage("便利さと安全", "N2", "Khoa học & Công nghệ",
                    "技術が進歩し、私たちの生活はますます便利になっている。"
                            + "しかし、その便利さの裏には、個人情報の流出などの危険もひそんでいる。"
                            + "パスワードを大切に管理するなど、自分を守る意識が欠かせない。"
                            + "便利な技術を安全に使う力が、これからの時代に求められている。",
                    "Tiện lợi và an toàn: công nghệ tiến bộ khiến đời sống tiện hơn, nhưng phía sau ẩn nguy cơ rò rỉ thông tin cá nhân; phải có ý thức tự bảo vệ như quản lý mật khẩu — kỹ năng dùng công nghệ an toàn là đòi hỏi thời đại mới."),

            // Văn hóa
            new SeedPassage("日本の食事のマナー", "N4", "Văn hóa",
                    "日本では、食事の前に「いただきます」と言います。"
                            + "食べ終わったら「ごちそうさま」と言うのがふつうです。"
                            + "これは、食べ物や作ってくれた人への感謝の気持ちを表しています。"
                            + "こうした言葉には、日本の文化が表れています。",
                    "Phép ăn uống của người Nhật: trước khi ăn nói 'itadakimasu', ăn xong nói 'gochisousama' để tỏ lòng biết ơn với thức ăn và người nấu — những lời ấy thể hiện văn hóa Nhật."),

            new SeedPassage("漫画とアニメ", "N4", "Văn hóa",
                    "日本の漫画やアニメは、世界中で人気があります。"
                            + "おもしろい物語や、美しい絵にひかれる人が多いです。"
                            + "アニメをきっかけに、日本語を勉強し始める外国人もいます。"
                            + "漫画やアニメは、今や日本を代表する文化の一つです。",
                    "Manga và anime: truyện tranh, hoạt hình Nhật được yêu thích khắp thế giới nhờ cốt truyện hay, tranh đẹp; nhiều người nước ngoài học tiếng Nhật vì anime — nay là nét văn hóa tiêu biểu của Nhật."),

            new SeedPassage("伝統と現代", "N3", "Văn hóa",
                    "日本には、古くから伝わる伝統と、新しい現代の文化がある。"
                            + "着物を着る機会は減ったが、お正月などには今も着る人がいる。"
                            + "古いものを大切にしながら、新しいものを取り入れていく。"
                            + "このバランスが、日本の文化の面白さだと思う。",
                    "Truyền thống và hiện đại: Nhật có cả truyền thống lâu đời lẫn văn hóa hiện đại; cơ hội mặc kimono ít đi nhưng dịp năm mới vẫn có người mặc; giữ cái cũ mà tiếp nhận cái mới — sự cân bằng ấy là nét thú vị của văn hóa Nhật."),

            new SeedPassage("言葉と文化", "N2", "Văn hóa",
                    "言葉は、その国の文化と深くつながっている。"
                            + "たとえば、日本語には季節を表す美しい言葉がたくさんある。"
                            + "こうした言葉からは、自然を大切にする日本人の心が感じられる。"
                            + "言葉を学ぶことは、その背景にある文化を知ることでもある。",
                    "Ngôn ngữ và văn hóa: ngôn ngữ gắn sâu với văn hóa mỗi nước — tiếng Nhật có nhiều từ đẹp tả mùa, qua đó cảm nhận tấm lòng trân quý thiên nhiên của người Nhật; học ngôn ngữ cũng là hiểu văn hóa phía sau."),

            new SeedPassage("世界の文化を知る", "N3", "Văn hóa",
                    "世界には、さまざまな文化がある。"
                            + "食べ物やあいさつの仕方は、国によって大きく違う。"
                            + "ちがいを「おかしい」と思うのではなく、「おもしろい」と感じることが大切だ。"
                            + "ほかの文化を知ることで、自分の国の文化もよく見えてくる。",
                    "Tìm hiểu văn hóa thế giới: mỗi nơi mỗi văn hóa — món ăn, cách chào khác nhau nhiều; đừng thấy khác biệt là 'kỳ' mà hãy thấy 'thú vị'; hiểu văn hóa khác cũng giúp nhìn rõ văn hóa nước mình."),

            // Sức khỏe
            new SeedPassage("手をあらおう", "N5", "Sức khỏe",
                    "外から帰ったら、手をあらいましょう。"
                            + "手には、目に見えないばいきんがたくさんついています。"
                            + "せっけんでていねいにあらうと、びょうきになりにくくなります。"
                            + "かんたんですが、とても大切なことです。",
                    "Hãy rửa tay: về nhà nhớ rửa tay vì tay bám nhiều vi khuẩn không thấy được; rửa kỹ bằng xà phòng sẽ ít bị bệnh — đơn giản nhưng rất quan trọng."),

            new SeedPassage("水をたくさん飲もう", "N5", "Sức khỏe",
                    "人の体の半分以上は水でできています。"
                            + "のどがかわく前に、水を飲むことが大切です。"
                            + "とくに夏は、たくさん汗をかくので気をつけましょう。"
                            + "水を飲むことは、健康を守る第一歩です。",
                    "Hãy uống nhiều nước: hơn nửa cơ thể là nước; nên uống trước khi khát, mùa hè ra nhiều mồ hôi càng phải chú ý — uống nước là bước đầu giữ sức khỏe."),

            new SeedPassage("運動の習慣", "N3", "Sức khỏe",
                    "健康な体を保つためには、運動の習慣が欠かせない。"
                            + "激しい運動でなくても、毎日少し歩くだけで効果がある。"
                            + "運動をすると、よく眠れるようになり、気分も明るくなる。"
                            + "無理をせず、続けられることから始めるのがいい。",
                    "Thói quen vận động: muốn giữ cơ thể khỏe thì không thể thiếu vận động; không cần dữ dội, mỗi ngày đi bộ chút cũng có tác dụng — vận động giúp ngủ ngon, tinh thần phấn chấn; nên bắt đầu từ việc duy trì được."),

            new SeedPassage("心の健康", "N3", "Sức khỏe",
                    "健康というと、体のことを思いうかべる人が多い。"
                            + "しかし、心の健康も同じくらい大切だ。"
                            + "つかれたときは、しっかり休んだり、人に話したりするとよい。"
                            + "体だけでなく、心も大事にする生活を送りたい。",
                    "Sức khỏe tinh thần: nhắc tới sức khỏe nhiều người nghĩ tới thân thể, nhưng sức khỏe tinh thần cũng quan trọng không kém; khi mệt hãy nghỉ đủ, tâm sự với người khác — sống chăm cả thân lẫn tâm."),

            new SeedPassage("バランスの良い食事", "N2", "Sức khỏe",
                    "健康のためには、バランスの良い食事が欠かせない。"
                            + "好きなものばかり食べていると、栄養がかたよってしまう。"
                            + "肉や魚、野菜などをまんべんなく食べることが大切だ。"
                            + "毎日の食事が、未来の健康をつくっていることを忘れてはいけない。",
                    "Ăn uống cân bằng: không thể thiếu cho sức khỏe; chỉ ăn món mình thích sẽ lệch dinh dưỡng; nên ăn đều thịt, cá, rau — đừng quên bữa ăn hằng ngày tạo nên sức khỏe tương lai.")
    );

    @Override
    @Transactional
    public void run(String... args) {
        int created = 0;
        for (int i = 0; i < SEED_PASSAGES.size(); i++) {
            SeedPassage s = SEED_PASSAGES.get(i);
            if (readingPassageRepository.existsByTitle(s.title())) continue;

            readingPassageRepository.save(ReadingPassage.builder()
                    .title(s.title())
                    .content(s.content())
                    .level(s.level())
                    .category(s.category())
                    .summary(s.summary())
                    .sortOrder(i + 1)
                    .build());
            created++;
        }
        log.info("Reading passage seed: {} new passages created (of {} defined).",
                created, SEED_PASSAGES.size());
    }
}