package com.ecotrace.passport;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@Tag(name = "Green Passports")
@RestController
public class PassportController {

    private final PassportService service;

    public PassportController(PassportService service) {
        this.service = service;
    }

    public record IssuePassportRequest(@NotNull UUID productId) {
    }

    @GetMapping("/periods/{id}/passports")
    public List<PassportService.PassportView> list(@PathVariable UUID id) {
        return service.listByPeriod(id);
    }

    @PostMapping("/periods/{id}/passports")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('OWNER')")
    public PassportService.PassportView issue(@PathVariable UUID id, @Valid @RequestBody IssuePassportRequest req) {
        return service.issue(id, req.productId());
    }

    @PostMapping("/passports/{id}/revoke")
    @PreAuthorize("hasRole('OWNER')")
    public void revoke(@PathVariable UUID id) {
        service.revoke(id);
    }
}

