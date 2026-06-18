# NOTES — Cheat Sheet Nhanh

> Tra cứu nhanh API + bảng DB. Chi tiết xem `flows.md`.

---

## API Endpoints

### Deck & Flashcard
| Action | Method | Endpoint |
|---|---|---|
| Tạo deck | POST | `/api/decks` |
| Clone deck | POST | `/api/decks/{id}/clone` |
| Gắn template | PUT | `/api/decks/{id}/template` |
| Tạo flashcard | POST | `/api/flashcards` |
| Tạo deck item | POST | `/api/deck-items` |

### Quizlet Study
| Action | Method | Endpoint |
|---|---|---|
| Lấy progress | GET | `/api/quizlet/study/{deckId}/progress` |
| Submit answer | POST | `/api/quizlet/study/answer` |
| Log session | POST | `/api/quizlet/study/session` |

### Anki/SRS
| Action | Method | Endpoint |
|---|---|---|
| Lấy queue | GET | `/api/anki/study/{deckId}` |
| Review card | POST | `/api/anki/study/review` |
| Xem stats | GET | `/api/anki/study/{deckId}/stats` |
| Cài settings | PUT | `/api/anki/settings/{deckId}` |

### Quiz/Assessment
| Action | Method | Endpoint |
|---|---|---|
| Tạo question | POST | `/api/questions` |
| Tạo quiz | POST | `/api/quizzes` |
| Publish quiz | POST | `/api/quizzes/{id}/publish` |
| Gắn question vào quiz | POST | `/api/quiz-questions` |
| Bắt đầu attempt | POST | `/api/attempts/start` |
| Submit 1 câu | POST | `/api/attempts/{id}/answer` |
| Nộp bài | POST | `/api/attempts/{id}/submit` |
| Xem kết quả | GET | `/api/attempts/{id}/review` |

### Classroom
| Action | Method | Endpoint |
|---|---|---|
| Tạo lớp | POST | `/api/classrooms` |
| Thêm thành viên | POST | `/api/class-members` |
| Giao quiz | POST | `/api/class-assignments` |
| Chia sẻ deck | POST | `/api/class-decks` |

---

## Bảng DB — Ghi Ở Đâu

### Khi tạo deck + thẻ
```
decks
deck_items
flashcards
flashcard_sides
flashcard_side_contents
flashcard_templates
```

### Khi học Quizlet (LearnMode)
```
quizlet_card_progress  ← UPSERT mỗi lần answer (unique: user+deckItem)
quizlet_study_logs     ← INSERT mỗi lần answer
quizlet_study_sessions ← INSERT cuối session
```

### Khi học Anki/SRS
```
anki_srs_progress  ← UPSERT mỗi lần review (unique: user+deck+flashcard)
                      (không có log riêng)
```

### Khi làm Quiz
```
quiz_attempts           ← INSERT khi start, UPDATE khi submit
quiz_attempt_questions  ← INSERT khi start (snapshot), UPDATE khi answer
user_quiz_progress      ← UPSERT khi start + submit
```

---

## State Machine

### Anki Card States
```
NEW ──GOOD/EASY──► LEARNING ──hết steps──► REVIEW
                                              │
                   RELEARNING ◄──AGAIN────────┘
                       │
                       └──hết steps──► REVIEW
```

### Quiz Attempt Status
```
IN_PROGRESS ──submit──► SUBMITTED
```

### User Quiz Progress Status
```
NOT_STARTED ──start──► IN_PROGRESS ──submit──► PASSED
                                           └──► FAILED
```

### Class Assignment Status
```
DRAFT ──publish──► ACTIVE ──close──► CLOSED
```

---

## Quy Tắc Quan Trọng

**Quizlet ≠ Anki — tách hoàn toàn:**
- Học Quizlet → KHÔNG chạm `anki_srs_progress`
- Học Anki → KHÔNG chạm `quizlet_card_progress`

**Quiz snapshot chống gian lận:**
- `correct_answer_snapshot` chỉ trả về sau khi `SUBMITTED`
- `options_snapshot` đã strip `isCorrect` trước khi gửi client
- Chấm điểm dùng snapshot, KHÔNG query `question_bank` → edit câu hỏi sau không ảnh hưởng bài cũ

**Deck visibility:**
- `PRIVATE` → chỉ owner thấy
- `PUBLIC` → ai cũng thấy và clone được

**Attempt limits:**
- `quiz.maxAttempts` → giới hạn toàn cục
- `classAssignment.maxAttempts` → override khi làm trong lớp

---

## SM2 Formula Nhanh (Anki)

```
REVIEW state:
  AGAIN → ease -= 0.20, lapse++, → RELEARNING
  HARD  → ease -= 0.15, interval = round(iv * 1.2 * mod)
  GOOD  → ease giữ,    interval = round(iv * ease * mod)
  EASY  → ease += 0.15, interval = round(iv * ease * 1.3 * mod)

  mod = intervalModifier * (0.90/targetRetention)²
  min ease = 1.3

memory_score = (ease - 1.3) / (3.5 - 1.3) * 100   → 0..100
```

---

## Packages Backend

```
domain/library/
  deck/              → Deck, DeckService
  deck_item/         → DeckItem
  flashcard/         → Flashcard, FlashcardSide, FlashcardSideContent, FlashcardTemplate
  quizlet/
    card_progress/   → QuizletCardProgress
    study/           → QuizletStudyController  ← answer + session
    study_log/       → QuizletStudyLog
    study_session/   → QuizletStudySession
  srs/
    srs_progress/    → AnkiSrsProgress
    srs_setting/     → AnkiSrsSetting
    algorithm_config/→ SrsAlgorithmConfig
    study/           → AnkiStudyController  ← queue + review + stats

domain/assessment/
  question/          → QuestionBank, QuestionOption
  tag/               → QuestionTag
  quiz/              → Quiz, QuizActionService (publish/clone/discard)
  quiz_question/     → QuizQuestion
  attempt/           → QuizAttempt, QuizAttemptQuestion, QuizAttemptServiceImpl
  progress/          → UserQuizProgress

domain/classroom/
  classroom/         → Classroom
  member/            → ClassMember
  assignment/        → ClassAssignment
  deck/              → ClassDeck
```

---

*Cập nhật: 2026-06-05*
