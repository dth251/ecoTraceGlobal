package com.ecotrace.common.exception;

import com.fasterxml.jackson.annotation.JsonInclude;

/** Định dạng lỗi thống nhất giữa backend và frontend (mục 20.3). */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ErrorResponse(String code, String message, Object details) {

    /** Lỗi gắn với một trường trong form (VALIDATION_ERROR). */
    public record FieldError(String field, String message) {
    }
}

