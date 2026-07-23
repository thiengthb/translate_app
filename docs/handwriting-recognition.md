# Nhận diện chữ viết tay kanji — hoạt động như thế nào?

> Giải thích cơ chế tính năng "Viết tay" trong trang Từ điển: tại sao mới viết
> vài nét đã có gợi ý, gợi ý lấy từ đâu, và database của hệ thống tham gia ở bước nào.

## TL;DR

- Các chữ đề xuất **KHÔNG lấy từ database của hệ thống** — chúng đến từ **Google Input Tools** (engine viết tay của Google Translate/Gboard).
- Backend chỉ là **proxy**: nhận tọa độ nét vẽ từ FE, đóng gói theo format Google, gửi đi, trả kết quả về. Không có query DB nào trong luồng này.
- DB chỉ tham gia ở bước **sau khi người dùng chọn chữ** — chữ được điền vào ô tìm kiếm và tra trong DB nội bộ.
- Vì vậy DB rỗng vẫn nhận diện viết tay bình thường, chỉ là tra cứu sau đó sẽ không ra kết quả.

## 1. Tại sao mới vài nét đã có gợi ý?

FE gọi API nhận diện **ngay mỗi khi người dùng nhấc bút/ngón tay lên** (kết thúc 1 nét), không đợi viết xong cả chữ.

`frontend/src/pages/dictionary/HandwritingInput.tsx` — hàm `endStroke()`:

```ts
const newStrokes: Stroke[] = [...strokesRef.current, [currentXs.current, currentYs.current]];
strokesRef.current = newStrokes;
...
recognize(newStrokes);   // ← gọi API ngay sau MỖI nét
```

- Viết nét 1 → gọi API với 1 nét; viết nét 2 → gọi lại với cả 2 nét…
- Mỗi lần gửi **toàn bộ các nét đã vẽ từ đầu**, không phải chỉ nét mới.
- `undo()` cũng gọi lại `recognize` với danh sách nét còn lại.

Mỗi nét được lưu dạng tọa độ thô trên canvas 272×272:

```ts
type Stroke = [number[], number[]]; // [[x coords], [y coords]]
```

## 2. Luồng đi của nét vẽ

```
Canvas (FE)                    Backend                          Google
[[xs],[ys]] các nét    →    POST /api/dictionary/handwriting  →   google.com/inputtools/request
                            (chỉ là PROXY, thêm timestamp,         (model ML nhận diện viết tay,
                             KHÔNG đụng tới DB)                     chứa kiến thức toàn bộ kanji/kana)
                       ←    tối đa 10 ký tự ứng viên          ←   ["食", "良", "飠", ...]
```

Backend — `DictionaryController.recognizeHandwriting()`
(`backend/.../system/dictionary/DictionaryController.java`):

1. Nhận mảng tọa độ nét vẽ từ FE.
2. Bổ sung mảng **timestamp giả** cho từng điểm (`i * 10` ms) vì Google bắt buộc
   có chiều thời gian: `[[xs],[ys]]` → `[[xs],[ys],[ts]]`.
3. Bọc vào body theo format Google: `writing_guide` (khung 272×272), `ink` (các nét),
   `language: "ja"`.
4. POST tới `https://www.google.com/inputtools/request?ime=handwriting...`.
5. Parse response, trả về **tối đa 10 ký tự ứng viên** cho FE.

Lưu ý: method này **không inject repository nào, không có câu query nào** —
hoàn toàn độc lập với dữ liệu kanji/từ vựng trong DB.

## 3. Google "đề xuất" như thế nào?

Engine nhận diện là **mô hình machine learning của Google** (cùng engine với
Google Translate / Gboard handwriting) — phía dự án không có thuật toán nhận diện nào.

- Model được huấn luyện trên hàng triệu mẫu chữ viết tay thật, nên "biết" hình dạng
  và thứ tự nét của **toàn bộ** kanji (kể cả chữ hiếm), hiragana, katakana.
- Đầu vào model: chuỗi nét (hình dạng, vị trí tương đối trong khung, thứ tự nét,
  chiều thời gian).
- **Hỗ trợ partial matching**: với input chưa hoàn chỉnh, model xếp hạng những ký tự
  *có phần mở đầu khớp nhất* với các nét đã vẽ. Ví dụ vẽ 2 nét đầu của 語 thì các
  chữ chứa bộ 言 (語, 話, 読…) đều được chấm điểm cao — nên mới vài nét đã ra danh
  sách hợp lý.
- Kết quả trả về **đã xếp hạng theo độ tin cậy** giảm dần — chữ đầu tiên thường đúng nhất.
- Vì set `language: "ja"`, model ưu tiên kanji/kana theo tần suất dùng trong tiếng Nhật.

### Hệ quả thực tế

1. **Thứ tự nét ảnh hưởng kết quả** — model học từ người viết đúng thứ tự nét chuẩn,
   nên viết sai thứ tự (vd nét dọc trước nét ngang) có thể ra gợi ý kém chính xác
   hơn dù hình cuối giống nhau.
2. **Mỗi nét = 1 request** đầy đủ (FE → BE → Google). Chữ nhiều nét (15–20 nét) sẽ
   bắn nhiều request liên tiếp. Code hiện chưa debounce / hủy request cũ, nên mạng
   chậm có thể thấy gợi ý "nhảy" do response về không đúng thứ tự.
   (Cải tiến khả dĩ: debounce ~300ms hoặc AbortController hủy request trước.)

## 4. DB của hệ thống tham gia ở bước nào?

Chỉ ở bước **SAU** khi người dùng bấm chọn một chữ trong danh sách gợi ý
(`HandwritingInput.tsx` → `onSelect(char)`):

- Chữ được điền vào ô tìm kiếm → gọi `/api/dictionary/search` hoặc `/kanji-search`
- **Đây** mới là chỗ query DB (`DictionaryServiceImpl`, `KanjiRepository`…).

Với DB rỗng sẽ thấy hiện tượng:

| Bước | DB rỗng |
|---|---|
| Viết tay → gợi ý chữ | ✅ Hiện đầy đủ (Google lo) |
| Chọn chữ → tìm kiếm | ❌ Không có kết quả (DB không có dữ liệu để tra) |

Tương tự, 2 tính năng khác cũng "sống" độc lập với DB vì đều là API ngoài:
- **Câu ví dụ Tatoeba** (`TatoebaClient`)
- **Audio phát âm Forvo** (`ForvoClient`)

Chỉ có search / browse / notebook là phụ thuộc dữ liệu trong DB nội bộ.