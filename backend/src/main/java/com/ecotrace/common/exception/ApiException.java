package com.ecotrace.common.exception;

import org.springframework.http.HttpStatus;

/**
 * Lỗi nghiệp vụ trả về client theo định dạng thống nhất {code, message, details} (mục 20.3).
 * {@code code} là mã ổn định để frontend dịch qua i18n.
 */
public class ApiException extends RuntimeException {

    private final HttpStatus status;
    private final String code;
    private final transient Object details;

    public ApiException(HttpStatus status, String code, String message, Object details) {
        super(message);
        this.status = status;
        this.code = code;
        this.details = details;
    }

    public ApiException(HttpStatus status, String code, String message) {
        this(status, code, message, null);
    }

    public static ApiException notFound(String entity, Object id) {
        return new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", entity + " not found", java.util.Map.of("entity", entity, "id", String.valueOf(id)));
    }

    public static ApiException periodLocked(Object periodId) {
        return new ApiException(HttpStatus.CONFLICT, "PERIOD_LOCKED", "Reporting period is locked", java.util.Map.of("periodId", String.valueOf(periodId)));
    }

    public static ApiException notImplemented(String feature) {
        return new ApiException(HttpStatus.NOT_IMPLEMENTED, "NOT_IMPLEMENTED", feature + " is not implemented yet");
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getCode() {
        return code;
    }

    public Object getDetails() {
        return details;
    }
}

