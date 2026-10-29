package com.ecotrace.product;

import com.ecotrace.product.domain.Product;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ProductRepository extends JpaRepository<Product, UUID> {

    List<Product> findAllByOrganizationIdOrderByCreatedAtAsc(UUID organizationId);
}

