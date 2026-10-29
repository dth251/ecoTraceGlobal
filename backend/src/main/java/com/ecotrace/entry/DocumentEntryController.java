package com.ecotrace.entry;

import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Tag(name = "Document Entry")
@RestController
@RequestMapping("/documents/{id}")
public class DocumentEntryController {

    private final DocumentEntryService service;

    public DocumentEntryController(DocumentEntryService service) {
        this.service = service;
    }

    @GetMapping("/entry")
    public Map<String, Object> getEntry(@PathVariable UUID id) {
        return service.getEntry(id);
    }

    @PutMapping("/entry")
    @PreAuthorize("hasAnyRole('OWNER','EDITOR')")
    public Map<String, Object> saveEntry(@PathVariable UUID id, @RequestBody Map<String, Object> body) {
        return service.saveEntry(id, body);
    }

    @PostMapping("/entry/validate")
    @PreAuthorize("hasAnyRole('OWNER','EDITOR')")
    public List<Map<String, Object>> validate(@PathVariable UUID id, @RequestBody Map<String, Object> body) {
        return service.validateOnly(id, body);
    }

    @PostMapping("/reject")
    @PreAuthorize("hasAnyRole('OWNER','EDITOR')")
    public void reject(@PathVariable UUID id, @RequestBody Map<String, String> body) {
        service.reject(id, body.get("reason"));
    }
}

