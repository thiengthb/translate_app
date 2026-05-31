# Test guide — Vocabulary-driven grammar drill (Phase 1)

A new practice mode: the learner picks one or more **grammar points** plus a
**vocabulary source** (JLPT level or one of their decks), and the app uses the
local LLM (Ollama) to generate single-grammar practice prompts seeded with that
vocabulary. Each generated prompt + reference sentence flows through the existing
grade pipeline.

> Each prompt is still **single-grammar**. "Multiple grammars" just means several
> grammar points are queued and one prompt is generated per point per round — it
> does **not** combine grammars into one sentence.

---

## 1. Prerequisites

- **Backend running** — do a clean build first (a stale generated class can break
  startup otherwise):
  ```
  cd backend
  ./mvnw clean spring-boot:run
  ```
- **Ollama running** with the configured model so generation works:
  ```
  ollama serve
  ollama pull qwen2.5-coder:3b      # or whatever ollama.model is set to
  ```
  Default URL `http://localhost:11434/api/generate` (see `ollama.api-url` / `ollama.model`).
- **Vocabulary seeded** — for the JLPT-level source to return words, the `words`
  table must have entries with a `level` (e.g. the seeded 50 Japanese words). For
  the deck source, you need at least one deck whose flashcards link to words.
- **Frontend running**: `cd frontend && npm run dev`.
- Log in (e.g. `student@example.com` / `password123`).

---

## 2. How to reach it

- **Sidebar** → group **"Tiếng Nhật"** → **"Luyện theo bộ"**, or
- Directly: `http://localhost:5173/production/drill`

> The sidebar entry is created on backend startup by `AutoMenuInitializer`. If you
> don't see it, confirm the backend restarted after pulling and that you're logged in.

---

## 3. Core test scenarios

### 3.1 Happy path — JLPT level source
1. Open **Luyện theo bộ**.
2. Select 2–3 grammar points (e.g. an N4 point).
3. Vocabulary source = **Theo cấp độ JLPT**, level **N5** (or a level you have words for).
4. Số câu mỗi mẫu = **2**.
5. Click **Bắt đầu luyện**.
6. **Expect:** a "Đang tạo câu hỏi…" spinner, then a prompt card showing a short
   **Vietnamese situation** ("Bạn ..."), an **AI** badge, and the suggested vocab
   words as chips. The Japanese model answer must use the target grammar; it uses
   the suggested words only where natural (best-effort — some prompts may use none).
7. Type a Japanese answer → **Nộp bài** → verdict + đáp án mẫu + your sentence + feedback.
8. **Câu tiếp** → next prompt generates. Total prompts = (#grammars × count).
9. After the last one → **"Hoàn thành! 🎉"** with **Luyện bộ mới**.

### 3.2 Deck source
- Repeat 3.1 but pick **Từ bộ thẻ của tôi** and choose a deck.
- **Expect:** the vocab chips are words drawn from that deck's cards.
- If you have no decks, the UI tells you to use the JLPT source — that's expected.

### 3.3 Multiple grammars + interleaving
- Select 3 grammar points, count = 2 (total 6).
- **Expect:** grammars are interleaved (G1, G2, G3, G1, G2, G3) — not the same
  grammar twice in a row. Progress shows "Câu x / 6".

### 3.4 Strict grading (verify the grader behaves)
With Ollama up, for one prompt try each:
- **Correct grammar + correct meaning** → should be **Đúng (PASS)**.
- **Correct grammar but wrong/partial meaning** → **Gần đúng (PARTIAL)**.
- **Right meaning but missing the target grammar** → **PARTIAL**.
- **Gibberish / unrelated** → **Chưa đạt (FAIL)**.
- PASS now requires meaning ≥ 0.85 **and** the grammar structure present.

### 3.5 UI bug fix — clearing the answer box
1. Submit an answer so the result card appears.
2. **Clear the textarea** (delete all text).
3. **Expect:** the **"Câu của bạn"** block in the result **stays** (snapshot of what
   you submitted). Previously it vanished. This is the reported bug.

### 3.6 Quality gate (generated reference actually uses the grammar)
- This is automatic: the backend re-checks each generated reference with the grammar
  detector/regex and retries once if the grammar is missing.
- **What to watch:** the **đáp án mẫu (100%)** should visibly contain the target
  grammar pattern. Flag any prompt where the model answer clearly doesn't use it.

### 3.7 Review gate — generated prompts stay out of the shared pool until approved
Generated content is created as `source = "GENERATED"` (pending) and is **excluded**
from the random `/production` ("Luyện viết câu") pool until a teacher approves it.
1. As a student, complete a few drill prompts for a grammar point.
2. Open the plain `/production` page and load that grammar's random exercise a few times.
   - **Expect:** you only ever see **seeded** prompts — never the AI ones you just drilled.
3. As a teacher/admin (authority `SCENARIO_STUB_UPDATE`), open **"Duyệt câu AI"** in the
   sidebar (group **Tiếng Nhật**) or go to `/production/review`. The queue lists every
   pending generated prompt with its Vietnamese situation + Japanese model answer.
   - A **student** has no sidebar entry; visiting `/production/review` is blocked, and
     `GET /api/production/prompts/pending` returns 403.
4. Click **Duyệt** on a good prompt → it leaves the queue and becomes pool-eligible
   (`/production` may now serve it). Click **Loại** on a bad one → marked `REJECTED`,
   leaves the queue, and stays out of the pool.

### 3.8 Reuse vs. fresh generation (LEVEL vs DECK source)
- **LEVEL source (public N5/N4…):** once a grammar point has ≥ 5 curated prompts
  (seeded + teacher-approved), the drill **reuses** one (no **AI** badge, no LLM call)
  with recency-avoid, instead of generating. Below 5 curated prompts it still
  generates fresh. So reuse only kicks in after enough content is approved.
- **DECK source (your own deck):** **always generates fresh** — a personal vocab set
  rarely repeats, so reuse doesn't apply.
- **What to watch:** drilling the same LEVEL grammar many times should eventually
  start serving curated prompts (badge disappears) once the approved pool fills.

### 3.9 Ollama offline / fallback
- Stop Ollama, then start a drill:
  - For a grammar that **has a seeded exercise** (the original hand-authored ones)
    → it falls back to that seeded prompt (no **AI** badge), grading still works
    (offline → at most **PARTIAL**, never a full PASS).
  - For a grammar with **no seed** → you get an error toast ("AI offline…"); use
    **Thử lại** or **Bỏ qua**. This is expected.

---

## 4. API (optional, via Swagger `http://localhost:8080/swagger-ui.html`)

- `GET  /api/production/grammars` — list selectable grammar points.
- `POST /api/production/generate` — body:
  ```json
  { "subUseId": 1, "source": { "type": "LEVEL", "level": "N5" } }
  ```
  or `{ "subUseId": 1, "source": { "type": "DECK", "deckId": 3 } }`
- `POST /api/production/attempt` — `{ "promptId": 123, "answer": "..." }` (unchanged).
- `GET  /api/production/prompts/pending` — list generated prompts awaiting review.
  Requires authority `SCENARIO_STUB_UPDATE`.
- `POST /api/production/prompts/{promptId}/approve` — promote a pending generated
  prompt into the shared pool. Requires authority `SCENARIO_STUB_UPDATE`.
- `POST /api/production/prompts/{promptId}/reject` — mark a pending generated prompt
  `REJECTED` (kept out of the pool). Requires authority `SCENARIO_STUB_UPDATE`.

---

## 5. Known limitations / things to note (not bugs)

- **Latency:** generation is a live LLM call (a few seconds; first call can be slow).
  Prompts are generated lazily, one at a time.
- **Review gate:** generated prompts are saved as `source = "GENERATED"` (pending)
  and are **kept out of** the shared random `/production` pool until a teacher
  approves them via `POST /api/production/prompts/{id}/approve` (flips to `APPROVED`).
  The person drilling still sees their own generated prompt immediately (it's served
  by `promptId`, not the pool). So unreviewed AI sentences never become someone
  else's "đáp án mẫu".
- **`source` columns** were added to `scenario_stubs` / `reference_sentences`
  (auto-created on H2 dev; a MySQL prod DB would need the columns added).
- **Situation language:** the learner-facing prompt is now the **Vietnamese
  situation** only (the old `[SITUATION]/[WORDS]/[REGISTER]` header was dropped —
  vocab shows as chips, level/name as badges). `l1Text` on generated references
  stores that Vietnamese situation; only the Japanese `l2Text` is used for grading.
- **Vocabulary is best-effort:** the seed words are *suggestions*. The model uses
  them only where natural and may use none; we validate the **grammar**, not the
  vocab. The grammar point itself is always mandatory and is never dropped.

---

## 6. What to report

For any issue, please note:
- The grammar point(s) + level/deck selected.
- Whether Ollama was running.
- The generated prompt text and the **đáp án mẫu** shown.
- Your answer and the verdict you got vs. what you expected.
