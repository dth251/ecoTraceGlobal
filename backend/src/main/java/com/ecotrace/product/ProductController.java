package com.ecotrace.product;

import com.ecotrace.common.audit.AuditService;
import com.ecotrace.common.exception.ApiException;
import com.ecotrace.common.tenant.TenantContext;
import com.ecotrace.product.domain.Product;
import com.ecotrace.product.domain.ProductFootprint;
import com.ecotrace.organization.domain.ReportingPeriod;
import com.ecotrace.organization.service.OrganizationService;
import com.ecotrace.product.domain.ProductionOutput;

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

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Tag(name = "Products & Footprints")
@RestController
public class ProductController {

    private final ProductRepository products;
    private final AllocationService allocationService;
    private final AuditService audit;
    private final ProductionOutputRepository outputs;
    private final OrganizationService organizationService;

    public ProductController(ProductRepository products, AllocationService allocationService, AuditService audit,
                             ProductionOutputRepository outputs, OrganizationService organizationService) {
        this.products = products;
        this.outputs = outputs;
        this.organizationService = organizationService;
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
    @Transactional
    public Map<String, Object> saveProduction(@PathVariable UUID id, @RequestBody List<Map<String, Object>> items) {
        ReportingPeriod period = organizationService.requireOpenPeriod(id);
        UUID orgId = TenantContext.organizationId();
        int saved = 0;
        for (Map<String, Object> item : items) {
            UUID productId = UUID.fromString(String.valueOf(item.get("productId")));
            products.findById(productId).filter(p -> orgId.equals(p.getOrganizationId()))
                    .orElseThrow(() -> ApiException.notFound("Product", productId));
            BigDecimal qty;
            try {
                qty = new BigDecimal(String.valueOf(item.get("quantity")));
            } catch (NumberFormatException e) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_QUANTITY", "quantity must be a number");
            }
            if (qty.signum() <= 0) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "NON_POSITIVE", "quantity must be > 0");
            }
            String unit = item.get("unit") != null ? String.valueOf(item.get("unit")) : "t";
            outputs.findByPeriodIdAndProductId(id, productId).ifPresentOrElse(
                    o -> o.update(qty, unit),
                    () -> outputs.save(new ProductionOutput(id, productId, qty, unit)));
            saved++;
        }
        var fps = allocationService.recompute(period);
        audit.record(AuditService.UPDATE, "production_output", id, null, Map.of("items", saved));
        return Map.of("saved", saved, "footprints", fps.size());
    }

    @GetMapping("/periods/{id}/footprints")
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getFootprints(@PathVariable UUID id) {
        // Dạng ProductFootprint ở frontend: kgCO2e trên một đơn vị sản phẩm
        return allocationService.getFootprints(id).stream().map(f -> {
            Map<String, Object> m = new java.util.LinkedHashMap<>();
            m.put("productId", f.getProductId());
            m.put("productName", products.findById(f.getProductId()).map(Product::getName).orElse(""));
            m.put("directPerUnit", f.getDirectCo2ePerUnit());
            m.put("indirectPerUnit", f.getIndirectCo2ePerUnit());
            m.put("precursorPerUnit", f.getPrecursorCo2ePerUnit());
            m.put("totalPerUnit", f.getTotalCo2ePerUnit());
            m.put("actualDataShare", f.getActualDataShare());
            m.put("allocationMethod", f.getAllocationMethod());
            return m;
        }).toList();
    }
}

