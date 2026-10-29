package com.ecotrace.document.storage;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.MediaTypeFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Trả file chứng từ lưu local qua URL ký HMAC có hạn (không cần token, giống presigned URL). */
@RestController
@ConditionalOnProperty(prefix = "app.storage", name = "type", havingValue = "local", matchIfMissing = true)
public class FileController {

    private final LocalFileStorage storage;

    public FileController(LocalFileStorage storage) {
        this.storage = storage;
    }

    @GetMapping("/files/**")
    public ResponseEntity<byte[]> get(HttpServletRequest request, @RequestParam long exp, @RequestParam String sig) {
        String key = request.getRequestURI().substring(request.getRequestURI().indexOf("/files/") + "/files/".length());
        byte[] bytes = storage.readSigned(key, exp, sig);
        if (bytes == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        MediaType type = MediaTypeFactory.getMediaType(key).orElse(MediaType.APPLICATION_OCTET_STREAM);
        return ResponseEntity.ok().contentType(type).body(bytes);
    }
}
