package com.example.starter_project_2025.system.analyze;

import com.worksap.nlp.sudachi.Config;
import com.worksap.nlp.sudachi.Dictionary;
import com.worksap.nlp.sudachi.DictionaryFactory;
import com.worksap.nlp.sudachi.Tokenizer;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Collections;
import java.util.List;

/**
 * Japanese morphological analyzer backed by the <b>Sudachi Java library</b>
 * ({@code com.worksap.nlp:sudachi}) with the Core dictionary.
 *
 * <h2>Dictionary setup</h2>
 * <p>The Core dictionary (~70 MB) is <em>not</em> a Maven artifact — it is
 * downloaded once during the Maven build via {@code download-maven-plugin} and
 * placed on the classpath at {@code sudachi/system_core.dic}. Run:
 * <pre>
 *   ./mvnw generate-resources     # first time: downloads zip (~70 MB)
 *   ./mvnw spring-boot:run         # normal dev start-up
 * </pre>
 *
 * <p>Alternatively, set {@code sudachi.dict-path} (or the {@code SUDACHI_DICT_PATH}
 * env var) to an absolute path of a pre-downloaded {@code system_core.dic} file.
 *
 * <h2>Thread safety</h2>
 * <p>The Sudachi {@link Tokenizer} is not thread-safe.
 * {@link #tokenize(String)} is {@code synchronized}, which serialises
 * concurrent requests against the single tokenizer instance.
 * For higher concurrency, replace with a {@code ThreadLocal<Tokenizer>} pool.
 */
@Slf4j
@Component
public class SudachiTokenizer implements AutoCloseable {

    /** Classpath location where the Maven build places the extracted .dic file. */
    private static final String DICT_CLASSPATH = "sudachi/system_core.dic";

    /**
     * Optional override: absolute path to {@code system_core.dic}.
     * Takes priority over classpath discovery.
     */
    @Value("${sudachi.dict-path:}")
    private String dictPathOverride;

    private Dictionary dictionary;
    private Tokenizer  tokenizer;

    // ── Lifecycle ──────────────────────────────────────────────────────────────

    @PostConstruct
    public void init() throws IOException {
        Path dictPath = resolveDictPath();
        // Use Path overload — avoids Windows URL path bug (/C:/... invalid on Windows).
        Config config = Config.defaultConfig().systemDictionary(dictPath);
        dictionary = new DictionaryFactory().create(config);
        tokenizer  = dictionary.create();
        log.info("Sudachi Core dictionary loaded: {}", dictPath);
    }

    @PreDestroy
    @Override
    public void close() {
        if (dictionary != null) {
            try { dictionary.close(); } catch (Exception e) {
                log.warn("Error closing Sudachi dictionary", e);
            }
        }
    }

    // ── Public API ─────────────────────────────────────────────────────────────

    /**
     * Tokenize {@code text} into morphemes using {@code SplitMode.C} (longest
     * natural segmentation — e.g. 「東京大学」 is one token, not two).
     * Returns an empty list for {@code null} / blank input.
     */
    public synchronized List<SudachiToken> tokenize(String text) {
        if (text == null || text.isBlank()) {
            return Collections.emptyList();
        }
        return tokenizer.tokenize(Tokenizer.SplitMode.C, text)
                .stream()
                .map(SudachiToken::from)
                .toList();
    }

    // ── Dictionary resolution ──────────────────────────────────────────────────

    private Path resolveDictPath() throws IOException {
        // 1. Explicit path override (env SUDACHI_DICT_PATH or property).
        if (dictPathOverride != null && !dictPathOverride.isBlank()) {
            log.info("Sudachi: using configured dict path: {}", dictPathOverride);
            return Paths.get(dictPathOverride);
        }

        // 2. Classpath resource placed by the Maven build (generate-resources phase).
        ClassPathResource resource = new ClassPathResource(DICT_CLASSPATH);
        if (resource.exists()) {
            try {
                // Running via 'mvnw spring-boot:run' or exploded deployment — file is on disk.
                // Use getFile().toPath() NOT getURL() — URL.getPath() returns "/C:/..." on
                // Windows (leading slash) which is invalid for java.nio.file.Path / Sudachi.
                Path path = resource.getFile().toPath();
                log.debug("Sudachi: dict found on filesystem: {}", path);
                return path;
            } catch (IOException ex) {
                // Running inside a fat jar — extract to temp file.
                return extractToTemp(resource);
            }
        }

        // 3. Nothing found — give actionable error.
        throw new IllegalStateException(
                "Sudachi Core dictionary not found!\n"
                + "Hãy chạy lệnh sau để tải từ điển (chỉ cần 1 lần, ~70 MB):\n"
                + "  ./mvnw generate-resources\n"
                + "Hoặc set SUDACHI_DICT_PATH=/duong/dan/toi/system_core.dic trong .env"
        );
    }

    /**
     * Extracts the classpath resource to a temp file for fat-jar deployment
     * where {@code getFile()} is not available.
     */
    private Path extractToTemp(ClassPathResource resource) throws IOException {
        File tmp = File.createTempFile("sudachi_system_core_", ".dic");
        tmp.deleteOnExit();
        try (InputStream in = resource.getInputStream()) {
            Files.copy(in, tmp.toPath(), StandardCopyOption.REPLACE_EXISTING);
        }
        log.info("Sudachi: dict extracted from jar to temp file: {}", tmp);
        return tmp.toPath();
    }
}
