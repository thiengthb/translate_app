package com.example.starter_project_2025.domain.library.deckimport;

import com.example.starter_project_2025.domain.library.deckimport.DeckImportDtos.DelimiterOption;
import com.example.starter_project_2025.domain.library.deckimport.DeckImportDtos.ImportTargetField;
import com.example.starter_project_2025.domain.library.deckimport.DeckImportDtos.PreviewResponse;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class DeckImportServiceParsingTest {

    private final DeckImportService service = new DeckImportService(
            null, null, null, null, null, null, null
    );

    @Test
    void preview_xlsxWithHeader_mapsColumns() throws Exception {
        PreviewResponse preview = service.preview(
                file("deck.xlsx", excelBytes(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
                DelimiterOption.AUTO,
                null,
                1,
                10,
                1L
        );

        assertEquals("Excel", preview.getDelimiter());
        assertTrue(preview.isHeaderDetected());
        assertEquals(2, preview.getTotalRows());
        assertEquals(ImportTargetField.FRONT, preview.getSuggestedMapping().get("c0"));
        assertEquals(ImportTargetField.READING, preview.getSuggestedMapping().get("c1"));
        assertEquals(ImportTargetField.BACK, preview.getSuggestedMapping().get("c2"));
        assertEquals(ImportTargetField.TAGS, preview.getSuggestedMapping().get("c3"));
        assertEquals("食べる", preview.getRows().getFirst().getValues().get("c0"));
    }

    @Test
    void preview_headerlessJapaneseCsv_infersFrontAndBackFromSamples() {
        PreviewResponse preview = previewText("deck.csv", "食べる,ăn\n飲む,uống\n");

        assertFalse(preview.isHeaderDetected());
        assertEquals(",", preview.getDelimiter());
        assertEquals(ImportTargetField.FRONT, preview.getSuggestedMapping().get("c0"));
        assertEquals(ImportTargetField.BACK, preview.getSuggestedMapping().get("c1"));
    }

    @Test
    void preview_textBulletPairs_importsFrontBack() {
        PreviewResponse preview = previewText("deck.txt", "- 食べる - ăn\n- 飲む - uống\n");

        assertEquals("Text pairs", preview.getDelimiter());
        assertEquals(2, preview.getTotalRows());
        assertEquals("食べる", preview.getRows().getFirst().getValues().get("c0"));
        assertEquals("ăn", preview.getRows().getFirst().getValues().get("c1"));
    }

    @Test
    void preview_numberedInlinePairs_importsFrontBack() {
        PreviewResponse preview = previewText("deck.txt", "1. 食べる - ăn\n2. 飲む - uống\n");

        assertEquals("Structured text", preview.getDelimiter());
        assertEquals(2, preview.getTotalRows());
        assertEquals("食べる", preview.getRows().getFirst().getValues().get("c0"));
        assertEquals("ăn", preview.getRows().getFirst().getValues().get("c1"));
    }

    private PreviewResponse previewText(String filename, String content) {
        return service.preview(
                file(filename, content.getBytes(StandardCharsets.UTF_8), "text/plain"),
                DelimiterOption.AUTO,
                null,
                1,
                10,
                1L
        );
    }

    private MockMultipartFile file(String filename, byte[] bytes, String contentType) {
        return new MockMultipartFile("file", filename, contentType, bytes);
    }

    private byte[] excelBytes() throws Exception {
        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Cards");
            Row header = sheet.createRow(0);
            header.createCell(0).setCellValue("Front");
            header.createCell(1).setCellValue("Reading");
            header.createCell(2).setCellValue("Meaning");
            header.createCell(3).setCellValue("Tags");

            Row first = sheet.createRow(1);
            first.createCell(0).setCellValue("食べる");
            first.createCell(1).setCellValue("たべる");
            first.createCell(2).setCellValue("ăn");
            first.createCell(3).setCellValue("verb;n5");

            Row second = sheet.createRow(2);
            second.createCell(0).setCellValue("飲む");
            second.createCell(1).setCellValue("のむ");
            second.createCell(2).setCellValue("uống");
            second.createCell(3).setCellValue("verb;n5");

            workbook.write(out);
            return out.toByteArray();
        }
    }
}
