package com.ecotrace.document.storage;

import java.net.URL;
import java.util.Optional;

/** Lưu trữ file chứng từ (S3/MinIO ở production, thư mục cục bộ ở dev). */
public interface FileStorage {

    void putObject(String key, String contentType, byte[] bytes);

    byte[] getObject(String key);

    /** URL ký tạm để trình duyệt tải trực tiếp; rỗng nếu kho không hỗ trợ (phải tải qua API). */
    Optional<URL> presignGetUrl(String key);
}
