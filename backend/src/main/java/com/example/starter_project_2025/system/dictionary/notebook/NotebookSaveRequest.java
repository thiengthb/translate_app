package com.example.starter_project_2025.system.dictionary.notebook;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;
import lombok.experimental.FieldDefaults;

/** Tạo / đổi tên một sổ tay. */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class NotebookSaveRequest {

    @NotBlank(message = "Tên sổ tay không được để trống")
    @Size(max = 120, message = "Tên sổ tay tối đa 120 ký tự")
    String name;

    @Size(max = 32, message = "Mã màu tối đa 32 ký tự")
    String color;
}