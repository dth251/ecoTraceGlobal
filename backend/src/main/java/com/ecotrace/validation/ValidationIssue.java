package com.ecotrace.validation;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Một lỗi hoặc cảnh báo kiểm tra dữ liệu (mục 7.4).
 * Dùng chung cho cả form nhập chứng từ và đọc file Excel mẫu.
 */
public record ValidationIssue(String field, Level level, String code, String message) {

    public enum Level {
        ERROR,
        WARNING
    }

    /** Frontend đọc mức độ qua trường {@code severity}. */
    @JsonProperty("severity")
    public Level severity() {
        return level;
    }

    public static ValidationIssue error(String field, String code, String message) {
        return new ValidationIssue(field, Level.ERROR, code, message);
    }

    public static ValidationIssue warning(String field, String code, String message) {
        return new ValidationIssue(field, Level.WARNING, code, message);
    }
}

