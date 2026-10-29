package com.ecotrace.document.storage;

import com.ecotrace.config.StorageConfig.StorageProperties;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

import java.net.URL;
import java.time.Duration;

/** Triển khai {@link FileStorage} bằng S3 API (tương thích MinIO, AWS S3, GCS). */
@Component
@ConditionalOnProperty(prefix = "app.storage", name = "type", havingValue = "s3")
public class S3FileStorage implements FileStorage {

    private final S3Client s3;
    private final S3Presigner presigner;
    private final StorageProperties props;

    public S3FileStorage(S3Client s3, S3Presigner presigner, StorageProperties props) {
        this.s3 = s3;
        this.presigner = presigner;
        this.props = props;
    }

    @Override
    public void putObject(String key, String contentType, byte[] bytes) {
        s3.putObject(PutObjectRequest.builder()
                .bucket(props.bucket())
                .key(key)
                .contentType(contentType)
                .build(), RequestBody.fromBytes(bytes));
    }

    @Override
    public URL presignGetUrl(String key) {
        Duration ttl = props.presignedUrlTtl() != null ? props.presignedUrlTtl() : Duration.ofMinutes(5);
        return presigner.presignGetObject(GetObjectPresignRequest.builder()
                .signatureDuration(ttl)
                .getObjectRequest(GetObjectRequest.builder()
                        .bucket(props.bucket())
                        .key(key)
                        .build())
                .build()).url();
    }
}

