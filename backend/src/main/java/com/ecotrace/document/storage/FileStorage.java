package com.ecotrace.document.storage;

import java.net.URL;

/** Giao diện lưu trữ file trong object storage (MinIO / S3 / GCS) — mục 5, 12. */
public interface FileStorage {

    void putObject(String key, String contentType, byte[] bytes);

    URL presignGetUrl(String key);
}

