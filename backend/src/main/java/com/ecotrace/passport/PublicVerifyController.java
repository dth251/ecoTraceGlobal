package com.ecotrace.passport;

import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/** Endpoint công khai kiểm tra hộ chiếu xanh (mục 11, 19.11 — không cần đăng nhập). */
@Tag(name = "Public Verification")
@RestController
@RequestMapping("/public")
public class PublicVerifyController {

    private final PassportService service;

    public PublicVerifyController(PassportService service) {
        this.service = service;
    }

    @GetMapping("/verify/{code}")
    public Map<String, Object> verify(@PathVariable String code) {
        return service.verifyPublicCode(code);
    }
}

