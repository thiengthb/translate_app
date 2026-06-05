package com.example.starter_project_2025.system.analyze;

import com.worksap.nlp.sudachi.Morpheme;

import java.util.List;

/**
 * One morpheme produced by {@link SudachiTokenizer}, wrapping a
 * {@link Morpheme} eagerly extracted from the Sudachi Java library.
 *
 * <p>Getters mirror the old Kuromoji {@code com.atilika.kuromoji.ipadic.Token}
 * API so all existing call sites work without change:
 * <ul>
 *   <li>{@link #getSurface()} — surface form as it appears in the text.</li>
 *   <li>{@link #getReading()} — katakana reading (Sudachi {@code readingForm()}).</li>
 *   <li>{@link #getPartOfSpeechLevel1()} — top-level POS (名詞, 動詞, …).</li>
 *   <li>{@link #getBaseForm()} — dictionary form (Sudachi {@code dictionaryForm()}).</li>
 *   <li>{@link #getConjugationForm()} — conjugation form normalized to base label
 *       (Sudachi uses {@code "仮定形-一般"} etc.; we strip the {@code "-…"} suffix so
 *       existing checks like {@code "仮定形".equals(t.getConjugationForm())} still pass).</li>
 * </ul>
 *
 * <p>Missing features (Sudachi emits {@code "*"} for inapplicable fields) are
 * returned as-is — {@link JapaneseTextUtils#orNull(String)} already treats
 * {@code "*"} as absent.
 */
public final class SudachiToken {

    private final String surface;
    private final List<String> pos;   // 6 elements: POS, sub1-3, conjType, conjForm
    private final String dictionaryForm;
    private final String readingForm;

    private SudachiToken(String surface, List<String> pos,
                         String dictionaryForm, String readingForm) {
        this.surface = surface;
        this.pos = pos;
        this.dictionaryForm = dictionaryForm;
        this.readingForm = readingForm;
    }

    /**
     * Eagerly copy all fields out of the {@link Morpheme} so the token can
     * safely outlive the tokenizer session.
     */
    static SudachiToken from(Morpheme m) {
        return new SudachiToken(
                m.surface(),
                List.copyOf(m.partOfSpeech()),
                m.dictionaryForm(),
                m.readingForm()
        );
    }

    private String posAt(int index) {
        if (index < pos.size()) {
            String v = pos.get(index);
            if (v != null && !v.isEmpty()) {
                return v;
            }
        }
        return "*";
    }

    /** Surface form as it appears in the original text. */
    public String getSurface() {
        return surface;
    }

    /** 品詞 — part-of-speech, top level (e.g. 名詞, 動詞, 助詞). */
    public String getPartOfSpeechLevel1() {
        return posAt(0);
    }

    /** 品詞細分類1 — POS sub-class 1. */
    public String getPartOfSpeechLevel2() {
        return posAt(1);
    }

    /** 品詞細分類2 — POS sub-class 2. */
    public String getPartOfSpeechLevel3() {
        return posAt(2);
    }

    /** 品詞細分類3 — POS sub-class 3. */
    public String getPartOfSpeechLevel4() {
        return posAt(3);
    }

    /** 活用型 — conjugation type (e.g. 五段-カ行). */
    public String getConjugationType() {
        return posAt(4);
    }

    /**
     * 活用形 — conjugation form, normalized to the base label.
     *
     * <p>Sudachi uses detail suffixes like {@code "仮定形-一般"}, {@code "連用形-一般"}.
     * This method strips everything from the first {@code '-'} onward so legacy
     * checks such as {@code "仮定形".equals(token.getConjugationForm())} keep working.
     */
    public String getConjugationForm() {
        String form = posAt(5);
        if ("*".equals(form)) {
            return form;
        }
        int dash = form.indexOf('-');
        return dash >= 0 ? form.substring(0, dash) : form;
    }

    /** 原形 — dictionary / base form. */
    public String getBaseForm() {
        return dictionaryForm;
    }

    /** 読み — katakana reading. */
    public String getReading() {
        return readingForm;
    }

    /** 発音 — katakana pronunciation (same as reading in Sudachi). */
    public String getPronunciation() {
        return readingForm;
    }
}
