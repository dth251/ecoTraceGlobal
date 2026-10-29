package com.ecotrace.validation;

/**
 * Một lỗi hoặc cảnh báo kiểm tra dữ liệu (mục 7.4).
 * Dùng chung cho cả form nhập chứng từ và đọc file Excel mẫu.
 */
public record ValidationIssue(String field, Level level, String code, String message) {

    public enum Level {
        ERROR,
        WARNING
    }

    public static ValidationIssue error(String field, String code, String message) {
        return new ValidationIssue(field, Level.ERROR, code, message);
    }

    public static ValidationIssue warning(String field, String code, String message) {
        return new ValidationIssue(field, Level.WARNING, code, message);
    }
}

