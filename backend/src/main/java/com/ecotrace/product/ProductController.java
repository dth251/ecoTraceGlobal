package com.ecotrace.product;

import com.ecotrace.common.audit.AuditService;
import com.ecotrace.common.exception.ApiException;
import com.ecotrace.common.tenant.TenantContext;
import com.ecotrace.product.domain.Product;
import com.ecotrace.product.domain.ProductFootprint;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Tag(name = "Products & Footprints")
@RestController
public class ProductController {

    private final ProductRepository products;
    private final AllocationService allocationService;
    private final AuditService audit;

    public ProductController(ProductRepository products, AllocationService allocationService, AuditService audit) {
        this.products = products;
        this.allocationService = allocationService;
        this.audit = audit;
    }

    public record CreateProductRequest(
            @NotBlank @Size(max = 255) String name,
            @Size(max = 16) String hsCode,
            @Size(max = 16) String cnCode,
            @Size(max = 16) String unit) {
    }

    @GetMapping("/products")
    @Transactional(readOnly = true)
    public List<Product> listProducts() {
        return products.findAllByOrganizationIdOrderByCreatedAtAsc(TenantContext.organizationId());
    }

    @PostMapping("/products")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('OWNER','EDITOR')")
    @Transactional
    public Product createProduct(@Valid @RequestBody CreateProductRequest req) {
        Product p = products.save(new Product(TenantContext.organizationId(),
                req.name().trim(), req.hsCode(), req.cnCode(), req.unit()));
        audit.record(AuditService.CREATE, "product", p.getId(), null, p);
        return p;
    }

    @PostMapping("/periods/{id}/production")
    @PreAuthorize("hasAnyRole('OWNER','EDITOR')")
    public Map<String, Object> saveProduction(@PathVariable UUID id, @RequestBody List<Map<String, Object>> items) {
        throw ApiException.notImplemented("POST /periods/{id}/production");
    }

    @GetMapping("/periods/{id}/footprints")
    public List<ProductFootprint> getFootprints(@PathVariable UUID id) {
        return allocationService.getFootprints(id);
    }
}

