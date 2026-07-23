# Hướng dẫn Import / Export Từ vựng (Vocabulary)

Từ vựng có cấu trúc phức tạp (nhiều **nghĩa** đa ngôn ngữ + nhiều **ví dụ**), nên
phần Import/Export của Từ vựng **dùng riêng**, không giống các bảng đơn giản khác.

> Trong app: vào trang **Vocabulary** (`/words`) → nút **Nhập / Xuất** trên thanh công cụ.
> Trong hộp thoại Import có nút **Tải file mẫu** — file Excel mẫu kèm sheet *“Huong dan”* và vài dòng ví dụ.
> File mẫu này là bản đầy đủ; tài liệu dưới đây tóm tắt lại để tham khảo nhanh.

## Quy tắc chung

- **Mỗi dòng = MỘT từ vựng.** Dòng 1 là tiêu đề cột — **không xoá / không đổi tên cột**.
- Hỗ trợ file **`.xlsx`** và **`.csv`** (CSV phải là **UTF-8**).
- **Chống trùng:** nếu đã tồn tại từ có cùng **`Word` + `Reading`**, dòng đó sẽ bị **bỏ qua**
  (không tạo trùng, cũng không ghi đè). Nhờ vậy nhập lại cùng một file là **an toàn**
  (idempotent). Kết quả import hiển thị số dòng **Skipped** riêng.
- Dòng nào lỗi sẽ được báo lại kèm **số dòng**; các dòng hợp lệ vẫn được nhập bình thường.
- Các **MÃ** (Representation, Level, mã ngôn ngữ) **phải đã tồn tại** trong hệ thống.

## Các cột

| Cột | Bắt buộc | Ý nghĩa | Ví dụ |
|---|:---:|---|---|
| `Word` | ✅ | Từ tiếng Nhật (kanji/kana) | `食べる` |
| `Reading` | | Cách đọc kana (furigana). Để trống nếu từ đã là kana | `たべる` |
| `WordType` | | Mã loại từ — xem trang **Word Types** | `v1`, `n`, `adj-i` |
| `Frequency` | | Số nguyên, càng nhỏ càng phổ biến | `1200` |
| `Representation` | ✅ | **Mã** dạng chữ — xem trang **Representations** | `KANJI`, `HIRAGANA`, `KATAKANA` |
| `Level` | ✅ | **Mã** cấp độ JLPT — xem trang **Levels** | `N5` … `N1` |
| `Meanings` | ✅ | Một hoặc nhiều nghĩa (xem cú pháp bên dưới) | `vi: ăn \| en: to eat` |
| `Examples` | | Một hoặc nhiều câu ví dụ (xem cú pháp bên dưới) | `毎朝ご飯を食べる。 => Mỗi sáng tôi ăn cơm.` |

## Cú pháp cột `Meanings`

- Nhiều nghĩa cách nhau bằng dấu `|`.
- Mỗi nghĩa có dạng: `mãNgônNgữ: nội dung`.
- Nếu **bỏ** `mãNgônNgữ:` thì mặc định là `vi` (tiếng Việt).

```
vi: ăn | en: to eat
vi: học sinh, sinh viên | en: student
ăn                         (⇐ không ghi mã ⇒ hiểu là vi: ăn)
```

## Cú pháp cột `Examples`

- Nhiều câu cách nhau bằng dấu `|`.
- Mỗi câu có dạng: `câu tiếng Nhật => bản dịch tiếng Việt`.
- Ngôn ngữ mặc định: câu gốc = tiếng Nhật, bản dịch = tiếng Việt.

```
毎朝ご飯を食べる。 => Mỗi sáng tôi ăn cơm. | 私はパンを食べる。 => Tôi ăn bánh mì.
```

## Ví dụ một dòng hoàn chỉnh

| Word | Reading | WordType | Frequency | Representation | Level | Meanings | Examples |
|---|---|---|---|---|---|---|---|
| 食べる | たべる | v1 | 1200 | KANJI | N5 | `vi: ăn \| en: to eat` | `毎朝ご飯を食べる。 => Mỗi sáng tôi ăn cơm.` |

File CSV mẫu sẵn dùng: [`word-import-sample.csv`](./word-import-sample.csv)
(lưu ý: ô `Meanings` chứa dấu phẩy nên được đặt trong dấu nháy kép `"..."` theo chuẩn CSV).