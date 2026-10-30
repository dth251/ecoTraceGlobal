package com.ecotrace.document.storage;

import com.ecotrace.config.StorageConfig.StorageProperties;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.net.URL;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;

/** Lưu chứng từ vào thư mục cục bộ (dev, khi đặt app.storage.local-dir). File được tải qua API có xác thực. */
@Component
@ConditionalOnExpression("'${app.storage.local-dir:}' != ''")
public class LocalFileStorage implements FileStorage {

    private final Path root;

    public LocalFileStorage(StorageProperties props) {
        this.root = Path.of(props.localDir()).toAbsolutePath().normalize();
    }

    @Override
    public void putObject(String key, String contentType, byte[] bytes) {
        Path target = resolve(key);
        try {
            Files.createDirectories(target.getParent());
            Files.write(target, bytes);
        } catch (IOException e) {
            throw new UncheckedIOException("Cannot store " + key, e);
        }
    }

    @Override
    public byte[] getObject(String key) {
        try {
            return Files.readAllBytes(resolve(key));
        } catch (IOException e) {
            throw new UncheckedIOException("Cannot read " + key, e);
        }
    }

    @Override
    public Optional<URL> presignGetUrl(String key) {
        return Optional.empty();
    }

    /** Chặn key thoát ra ngoài thư mục gốc (path traversal). */
    private Path resolve(String key) {
        Path p = root.resolve(key).normalize();
        if (!p.startsWith(root)) {
            throw new IllegalArgumentException("Invalid storage key");
        }
        return p;
    }
}
