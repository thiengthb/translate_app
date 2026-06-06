package com.example.starter_project_2025.system.dictionary.notebook;

import jakarta.validation.constraints.Size;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class NotebookNoteRequest {
    @Size(max = 2000, message = "Ghi chú tối đa 2000 ký tự")
    String note;
}