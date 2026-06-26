# Tài liệu: Tính năng "Viết chữ Kanji" trong Từ điển

Tài liệu này giải thích **chi tiết từng hàm** của các tính năng liên quan tới
việc *viết chữ Kanji* trong trang Từ điển (`/dictionary`), gồm **2 tính năng độc lập**:

| # | Tính năng | Mô tả | BE | FE |
|---|-----------|-------|----|----|
| A | **Thứ tự nét viết** (Stroke Order) | Xem animation cách viết một kanji theo từng nét | *(không có — gọi thẳng CDN KanjiVG)* | `KanjiStrokeOrder.tsx` |
| B | **Viết tay nhận diện** (Handwriting) | Người dùng vẽ kanji bằng chuột/cảm ứng → hệ thống đoán ra chữ | `DictionaryController.recognizeHandwriting` | `HandwritingInput.tsx` |

> Hai tính năng dễ nhầm: **A = "máy chỉ cho mình cách viết"**, **B = "mình viết, máy đoán chữ"**.

---

# PHẦN A — Thứ tự nét viết (Stroke Order)

**File:** `frontend/src/pages/dictionary/KanjiStrokeOrder.tsx`
**Dùng ở:** `KanjiDetailCard` (trong `DictionaryPage.tsx`) — mục accordion *"Thứ tự nét viết"*.
**Backend:** không có. Dữ liệu nét được tải trực tiếp từ CDN **KanjiVG** qua jsDelivr.

## A.1. Luồng hoạt động tổng quát

```
character (vd: 食)
   │  toHex5 → "098df"
   ▼
GET https://cdn.jsdelivr.net/gh/KanjiVG/kanjivg@master/kanji/098df.svg
   │  parse SVG, lọc các <path id="...-sN">  (mỗi path = 1 nét)
   ▼
strokes: [{id, d}, ...]
   │  render <svg> chứa các <StrokePath>
   ▼
Animation: vẽ lần lượt từng nét bằng kỹ thuật stroke-dasharray / dashoffset
```

Ý tưởng cốt lõi của animation: mỗi nét là một `<path>`. Đặt `stroke-dasharray = chiều dài path`
và `stroke-dashoffset = chiều dài path` ⇒ nét bị "giấu" hoàn toàn. Khi cho `dashoffset → 0`
kèm `transition`, trình duyệt vẽ dần nét ra như đang viết tay.

## A.2. Hằng số & kiểu dữ liệu

- `interface StrokeData { id: string; d: string; }` — một nét: `id` (vd `kvg:09df-s3`)
  và `d` (chuỗi path SVG).
- `SPEEDS` — 3 mức tốc độ animation: Chậm (1200ms), Vừa (700ms), Nhanh (280ms).
  `ms` là thời gian vẽ xong **một** nét.

## A.3. `toHex5(char)`

```ts
function toHex5(char: string) {
    return char.codePointAt(0)!.toString(16).padStart(5, "0");
}
```
- Lấy **code point** Unicode của ký tự, đổi sang **hex**, đệm `0` cho đủ **5 chữ số**.
- KanjiVG đặt tên file theo quy ước này (vd 食 = U+98DF → `098df.svg`).
- Dùng `codePointAt` (không phải `charCodeAt`) để xử lý đúng cả ký tự ngoài BMP.

## A.4. Component `StrokePath` — một nét có animation

```ts
function StrokePath({ d, state, ms })
```
Nhận:
- `d`: dữ liệu path của nét.
- `state`: `"hidden"` (chưa vẽ) | `"animating"` (đang vẽ) | `"shown"` (đã vẽ xong).
- `ms`: thời lượng animation.

Bên trong:
- `ref` trỏ tới `<path>`; `len` = chiều dài path.
- `useEffect([d])`: khi path đổi, gọi `ref.current.getTotalLength()` để lấy **chiều dài thật**
  của nét (cần cho dasharray/offset). Lưu vào `len`.
- Render `<path>`:
  - `stroke`: màu xanh `#3b82f6` khi đang vẽ (`animating`), còn lại dùng `currentColor`.
  - `strokeWidth = 3.5`, bo tròn đầu nét (`round`).
  - `style`:
    - Khi đã có `len`: đặt `strokeDasharray = len`; `strokeDashoffset = len` nếu `hidden`,
      ngược lại `0` (hiện đầy đủ). `transition` chỉ áp dụng cho `dashoffset` khi `animating`
      (tạo hiệu ứng vẽ), còn lại chỉ transition màu.
    - Khi chưa đo được `len`: `opacity: 0` (ẩn tạm để tránh nhấp nháy).

## A.5. Component `CtrlBtn` — nút điều khiển tròn

```ts
function CtrlBtn({ onClick, disabled, title, children })
```
- Nút icon vuông `h-8 w-8`, bo góc, có trạng thái hover & disabled.
- Dùng cho các nút **Nét trước / Đặt lại / Nét sau**.

## A.6. Component chính `KanjiStrokeOrder({ character })`

### State / ref
- `strokes` — danh sách nét đã tải.
- `phase` — `"idle" | "loading" | "ok" | "error"` (trạng thái tải dữ liệu).
- `drawn` — số nét đang được vẽ (0 = chưa vẽ, N = đã vẽ N nét).
- `playing` — đang tự động chạy animation hay không.
- `speedIdx` — chỉ số tốc độ đang chọn (vào mảng `SPEEDS`).
- `timer` — ref giữ `setTimeout` để clear khi cần.
- `ms = SPEEDS[speedIdx].ms`.

### Effect 1 — Tải dữ liệu nét từ KanjiVG (`useEffect([character])`)
- Khi `character` đổi: reset state (`loading`, xóa strokes, `drawn=0`, dừng chạy, clear timer).
- `fetch` file SVG từ CDN theo `toHex5(character)`.
- Parse XML bằng `DOMParser`, lấy tất cả `<path>`, **lọc** những path có `id` kết thúc bằng
  `-s<number>` (đây mới là nét viết thật; KanjiVG còn chứa path phụ khác).
- `setStrokes(paths)` và `setPhase("ok")` nếu có nét, ngược lại `"error"`.
- `catch` → `"error"`. Cleanup: clear timer.

### Effect 2 — Tự động chạy từng nét (`useEffect([playing, drawn, strokes.length, ms])`)
- Nếu không `playing` → bỏ qua.
- Nếu `drawn >= strokes.length` (đã vẽ hết) → dừng (`setPlaying(false)`).
- Ngược lại: hẹn `setTimeout` sau `ms + 120ms` rồi tăng `drawn` lên 1 (vẽ nét kế tiếp).
  `+120ms` là khoảng nghỉ nhỏ giữa 2 nét cho dễ nhìn.
- Cleanup: clear timer mỗi lần effect chạy lại (tránh chồng timer).

### Các hàm điều khiển
- `play()` — nếu đã vẽ hết thì `drawn=0` (chạy lại từ đầu), rồi `setPlaying(true)`.
- `pause()` — `setPlaying(false)`.
- `reset()` — dừng + `drawn=0`.
- `prev()` — dừng + lùi 1 nét (không nhỏ hơn 0).
- `next()` — dừng + tiến 1 nét (không vượt tổng số nét).

### Render theo `phase`
- `"loading"` → spinner.
- `"error"` → dòng chữ "Không có dữ liệu stroke order cho kanji này."
- khác `"ok"` → `null`.
- `"ok"` → giao diện chính gồm:
  1. **Canvas SVG** `viewBox="0 0 109 109"` (hệ toạ độ chuẩn của KanjiVG), kích thước hiển thị `190×190`:
     - Lưới hướng dẫn: khung ngoài + 2 đường gạch đứt chia đôi (giúp căn chữ).
     - Map `strokes` → `<StrokePath>`, truyền `state` dựa trên `drawn`:
       - `i < drawn - 1` → `"shown"`,
       - `i === drawn - 1` → `"animating"`,
       - còn lại → `"hidden"`.
     - Bộ đếm `drawn/total` ở góc trên phải.
  2. **Hàng chấm tiến độ** — mỗi nét một chấm; click để nhảy tới nét đó (`setDrawn(i+1)`).
     Chấm xanh nếu nét đã vẽ.
  3. **Cụm nút phát lại** — Nét trước / Đặt lại / nút lớn (Xem ▸ / Dừng ⏸ / Tiếp / Lại tuỳ trạng thái) / Nét sau.
  4. **Chọn tốc độ** — 3 nút Chậm / Vừa / Nhanh, đổi `speedIdx`.

### Các hàm Icon
`PlayIcon, PauseIcon, ReplayIcon, ResetIcon, PrevIcon, NextIcon` — trả về `<svg>` thuần,
chỉ là hình icon, không có logic.

### Lưu ý vận hành
- Phụ thuộc **mạng + CDN KanjiVG**. Nếu offline hoặc CDN chặn → `phase = "error"`.
- Không tốn tài nguyên backend; mỗi kanji là một request SVG tĩnh (jsDelivr cache rất tốt).

---

# PHẦN B — Viết tay nhận diện (Handwriting)

**FE:** `frontend/src/pages/dictionary/HandwritingInput.tsx`
**API client:** `dictionaryApi.recognizeHandwriting` (`frontend/src/api/features/dictionary.api.ts`)
**BE:** `DictionaryController.recognizeHandwriting` + DTO `HandwritingRequest`
**Dùng ở:** thanh search của `DictionaryPage` (nút bút chì). Khi chọn được chữ → đổ vào ô tìm kiếm.

## B.1. Luồng hoạt động tổng quát

```
Người dùng vẽ trên <canvas>
   │  mỗi nét = [ [x0,x1,...], [y0,y1,...] ]   (Stroke)
   ▼ (sau mỗi nét vẽ xong)
FE: dictionaryApi.recognizeHandwriting(strokes)
   │  POST /api/dictionary/handwriting   body: { strokes }
   ▼
BE: recognizeHandwriting()
   │  chuyển [xs, ys] → [xs, ys, ts]  (thêm mốc thời gian giả)
   │  dựng body theo định dạng Google Input Tools
   ▼
   → POST tới Google Input Tools (proxy)
   │  parse kết quả  ["SUCCESS", [[ "id", [danh sách chữ] ]]]
   ▼
trả về List<String> (tối đa 10 gợi ý) → FE hiển thị nút chọn
```

## B.2. Frontend — `HandwritingInput.tsx`

### Kiểu & hằng số
- `type Stroke = [number[], number[]]` — một nét gồm mảng `x` và mảng `y` song song.
- `CANVAS_W = CANVAS_H = 272` — kích thước **bitmap** canvas (toạ độ vẽ chuẩn hoá theo đây,
  cũng trùng `writing_area` gửi cho Google).

### Props
- `onSelect(char: string)` — callback khi người dùng chọn một chữ gợi ý.

### State / ref
- `isOpen` — panel viết tay đang mở.
- `suggestions` — danh sách chữ gợi ý từ BE.
- `recognizing` — đang gọi API nhận diện.
- `strokeCount` — số nét hiện có (để hiển thị + bật/tắt nút Undo).
- `errorMsg` — thông báo lỗi.
- `containerRef` — bao panel (để bắt click ra ngoài).
- `canvasRef` — phần tử `<canvas>`.
- `isDrawing` — đang trong một nét (giữa mousedown..up).
- `strokesRef` — **nguồn dữ liệu chuẩn** chứa tất cả nét đã hoàn tất (dùng ref, không phải state,
  để không bị mất khi re-render).
- `currentXs / currentYs` — toạ độ của nét **đang vẽ dở**.

### Các Effect
- **Đóng khi click ra ngoài** (`useEffect([isOpen])`) — lắng nghe `mousedown` toàn document.
- **Đóng khi nhấn Escape** (`useEffect([isOpen])`).
- **Reset khi mở panel** (`useEffect([isOpen])`) — sau 10ms (đợi canvas mount): xoá hết nét, xoá gợi ý/ lỗi, vẽ lưới hướng dẫn.
- **Đặt kích thước bitmap canvas MỘT lần** (`useLayoutEffect([isOpen])`) — chỉ gán `canvas.width/height`
  khi khác giá trị mong muốn. ⚠️ Gán `canvas.width/height` **luôn xoá sạch** nội dung canvas,
  nên phải tránh để React gán lại mỗi lần render (đây từng là bug làm mất nét đã vẽ).
- **"Lưới an toàn" đồng bộ canvas sau mỗi render** (`useLayoutEffect` không deps) — nếu panel mở và
  **không** đang vẽ dở thì `redrawAll(strokesRef.current)`. Mục đích: bất cứ khi nào canvas bị xoá
  (re-render, đổi theme...) thì vẽ lại từ dữ liệu chuẩn.

### Hàm vẽ
- `isDark()` — kiểm tra theme tối (để chọn màu nền/nét).
- `drawGuides()` — xoá canvas, tô nền, vẽ **khung ngoài** + **2 đường gạch đứt** chia đôi.
- `redrawAll(strokes)` — vẽ lưới rồi vẽ lại **toàn bộ** nét đã có (mỗi nét nối các điểm `(x,y)`).
  Đây là hàm "vẽ lại từ dữ liệu chuẩn".
- `getXY(e)` — đổi toạ độ chuột/cảm ứng (theo màn hình) sang toạ độ canvas, **chuẩn hoá** theo
  tỉ lệ `CANVAS_W/H` so với kích thước hiển thị thật của canvas (vì CSS có thể scale).

### Hàm xử lý nét
- `startStroke(x, y)` — bắt đầu một nét: xoá lỗi, `redrawAll` (đảm bảo nét cũ còn đó), bật `isDrawing`,
  khởi tạo `currentXs/Ys` bằng điểm đầu, `moveTo(x,y)`.
- `continueStroke(x, y)` — đang vẽ thì thêm điểm vào `currentXs/Ys`, rồi **vẽ lại toàn bộ** (lưới + nét cũ
  + nét đang vẽ). Vẽ lại toàn bộ mỗi lần để chống việc canvas bị xoá giữa chừng.
- `endStroke()` — kết thúc nét: tắt `isDrawing`. Nếu nét có < 2 điểm (chấm lỡ) thì bỏ. Ngược lại
  thêm nét vào `strokesRef`, reset `currentXs/Ys`, `redrawAll`, cập nhật `strokeCount`,
  rồi **gọi `recognize`** để nhận diện ngay.
- `recognize(strokes)` — `setRecognizing(true)`, gọi `dictionaryApi.recognizeHandwriting(strokes)`,
  đổ kết quả vào `suggestions`. Nếu rỗng → báo "Không nhận diện được". Bắt lỗi theo HTTP status
  (401 chưa đăng nhập, 500 backend lỗi, khác → lỗi kết nối). `finally` tắt `recognizing`.
- `undo()` — bỏ nét cuối (`slice(0,-1)`), vẽ lại; nếu còn nét thì nhận diện lại, không còn thì xoá gợi ý.
- `clear()` — xoá toàn bộ nét, gợi ý, vẽ lại lưới trống.
- `handleSelect(char)` — gọi `onSelect(char)`, đóng panel, `clear()`.

### Render
- **Nút bút chì** mở/đóng panel.
- **Panel** (khi `isOpen`): header (tiêu đề + số nét + nút Undo/Xóa), `<canvas>` với đủ handler
  chuột & cảm ứng (`onMouseDown/Move/Up/Leave`, `onTouchStart/Move/End` — touch có `preventDefault`
  để chặn cuộn trang), và khu **Gợi ý**:
  - đang nhận diện → spinner,
  - có lỗi → hộp đỏ,
  - có gợi ý → các nút chữ (bấm để `handleSelect`),
  - chưa vẽ → hướng dẫn "Vẽ để nhận diện chữ".
- `PencilIcon / UndoIcon / TrashIcon` — icon SVG thuần.

### Vì sao "vẽ lại toàn bộ" nhiều lần?
Canvas dễ bị xoá ngoài ý muốn (React gán lại `width/height`, đổi theme, sự kiện touch+mouse double-fire
trên vài thiết bị). Thay vì vẽ thêm (incremental), code luôn **vẽ lại từ `strokesRef`** — dữ liệu chuẩn —
để canvas luôn khớp dữ liệu thật.

## B.3. API client — `dictionaryApi.recognizeHandwriting`

```ts
recognizeHandwriting: async (strokes: Array<[number[], number[]]>): Promise<string[]> => {
    const response = await axiosInstance.post<string[]>("/dictionary/handwriting", { strokes });
    return response.data;
}
```
- Gửi `POST /api/dictionary/handwriting` với body `{ strokes }`.
- `strokes` là mảng các nét `[xs, ys]`. Trả về mảng chuỗi (các chữ gợi ý).

## B.4. Backend — DTO `HandwritingRequest`

```java
@Data
public class HandwritingRequest {
    private List<List<List<Integer>>> strokes; // [ nét ][ 0=xs | 1=ys ][ điểm ]
}
```
- `strokes`: danh sách nét; mỗi nét là `[[x...],[y...]]`. Tức 3 tầng `List`:
  *nét → trục (x/y) → các điểm*.

## B.5. Backend — `DictionaryController.recognizeHandwriting`

**Endpoint:** `POST /api/dictionary/handwriting` (yêu cầu đăng nhập — nằm dưới `/api/dictionary/**`,
không thuộc `PUBLIC_ENDPOINTS`).

Các bước trong hàm:
1. **Kiểm tra rỗng:** nếu `strokes` null/rỗng → trả `[]`.
2. **Chuyển `[xs, ys]` → `[xs, ys, ts]`:** Google Input Tools yêu cầu mỗi nét có **3 mảng**:
   x, y và **timestamp** từng điểm. Code sinh `ts` giả bằng `i * 10` (mỗi điểm cách 10ms) —
   chỉ cần tăng dần, giá trị không quan trọng với độ chính xác.
3. **Dựng request body cho Google:**
   - `writing_guide`: vùng viết `272×272` (khớp `CANVAS_W/H` ở FE — rất quan trọng để toạ độ đúng tỉ lệ).
   - `ink`: danh sách nét đã thêm timestamp.
   - `language: "ja"`.
   - Bọc trong `{ device, options: "enable_pre_space", requests: [innerRequest] }`.
4. **Gọi Google Input Tools** bằng `HttpClient` (HTTP/1.1, timeout 8s), kèm header giả lập trình duyệt
   (`User-Agent`, `Referer`, `Origin`) để Google chấp nhận. Gửi body JSON (UTF-8).
5. **Parse kết quả:** response dạng `["SUCCESS", [[ "<id>", ["食","飠",...] ]] , ...]`.
   - Nếu phần tử đầu là `"SUCCESS"`: lấy `data[1][0][1]` = danh sách chữ, trả về **tối đa 10** chữ.
   - Nếu không `SUCCESS` → log cảnh báo.
6. **Bắt lỗi:** mọi exception đều log và **trả `[]`** (không ném lỗi ra ngoài) — FE sẽ hiểu là
   "không nhận diện được" thay vì sập.

### Vì sao cần proxy qua backend?
- Tránh **CORS** (gọi thẳng Google từ trình duyệt sẽ bị chặn).
- Giấu chi tiết tích hợp & gắn các header cần thiết phía server.
- Cho phép áp **xác thực** (`/api/dictionary/**` yêu cầu đăng nhập).

---

# Tóm tắt nhanh

- **A. Thứ tự nét viết:** thuần FE, tải SVG nét từ **KanjiVG CDN**, animate bằng kỹ thuật
  `stroke-dasharray/dashoffset`. Không động tới backend.
- **B. Viết tay:** FE vẽ canvas → thu `strokes [xs, ys]` → BE thêm timestamp, proxy tới
  **Google Input Tools** → trả danh sách chữ gợi ý. Backend chỉ là **proxy + chuẩn hoá dữ liệu**,
  không lưu gì.

| Thành phần | File |
|---|---|
| Stroke order (FE) | `frontend/src/pages/dictionary/KanjiStrokeOrder.tsx` |
| Handwriting (FE) | `frontend/src/pages/dictionary/HandwritingInput.tsx` |
| API client | `frontend/src/api/features/dictionary.api.ts` → `recognizeHandwriting` |
| Handwriting (BE) | `…/system/dictionary/DictionaryController.java` → `recognizeHandwriting` |
| DTO | `…/system/dictionary/HandwritingRequest.java` |