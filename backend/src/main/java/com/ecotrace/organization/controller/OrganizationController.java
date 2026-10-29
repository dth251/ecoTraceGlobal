package com.ecotrace.organization.controller;

import com.ecotrace.organization.dto.OrganizationDtos.CreatePeriodRequest;
import com.ecotrace.organization.dto.OrganizationDtos.FacilityDto;
import com.ecotrace.organization.dto.OrganizationDtos.InviteUserRequest;
import com.ecotrace.organization.dto.OrganizationDtos.OrganizationDto;
import com.ecotrace.organization.dto.OrganizationDtos.PeriodDto;
import com.ecotrace.organization.dto.OrganizationDtos.UpdateOrganizationRequest;
import com.ecotrace.organization.dto.OrganizationDtos.UpsertFacilityRequest;
import com.ecotrace.organization.dto.OrganizationDtos.UserMemberDto;
import com.ecotrace.organization.service.OrganizationService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@Tag(name = "Organization, Facilities & Periods")
@RestController
public class OrganizationController {

    private final OrganizationService service;

    public OrganizationController(OrganizationService service) {
        this.service = service;
    }

    // --- Tổ chức (/organizations/me, /users) ---

    @GetMapping("/organizations/me")
    public OrganizationDto getMyOrganization() {
        return service.getCurrentOrganization();
    }

    @PutMapping("/organizations/me")
    @PreAuthorize("hasRole('OWNER')")
    public OrganizationDto updateMyOrganization(@Valid @RequestBody UpdateOrganizationRequest req) {
        return service.updateCurrentOrganization(req);
    }

    @GetMapping("/users")
    @PreAuthorize("hasRole('OWNER')")
    public List<UserMemberDto> listUsers() {
        return service.listUsers();
    }

    @PostMapping("/users")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('OWNER')")
    public UserMemberDto inviteUser(@Valid @RequestBody InviteUserRequest req) {
        return service.inviteUser(req);
    }

    // --- Nhà máy (/facilities) ---

    @GetMapping("/facilities")
    public List<FacilityDto> listFacilities() {
        return service.listFacilities();
    }

    @GetMapping("/facilities/{id}")
    public FacilityDto getFacility(@PathVariable UUID id) {
        return service.getFacility(id);
    }

    @PostMapping("/facilities")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('OWNER','EDITOR')")
    public FacilityDto createFacility(@Valid @RequestBody UpsertFacilityRequest req) {
        return service.createFacility(req);
    }

    @PutMapping("/facilities/{id}")
    @PreAuthorize("hasAnyRole('OWNER','EDITOR')")
    public FacilityDto updateFacility(@PathVariable UUID id, @Valid @RequestBody UpsertFacilityRequest req) {
        return service.updateFacility(id, req);
    }

    @DeleteMapping("/facilities/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('OWNER')")
    public void deleteFacility(@PathVariable UUID id) {
        service.deleteFacility(id);
    }

    // --- Kỳ báo cáo (/periods) ---

    @GetMapping("/periods")
    public List<PeriodDto> listPeriods(@RequestParam(required = false) UUID facilityId) {
        return service.listPeriods(facilityId);
    }

    @PostMapping("/periods")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('OWNER','EDITOR')")
    public PeriodDto createPeriod(@Valid @RequestBody CreatePeriodRequest req) {
        return service.createPeriod(req);
    }

    @PostMapping("/periods/{id}/lock")
    @PreAuthorize("hasRole('OWNER')")
    public PeriodDto lockPeriod(@PathVariable UUID id) {
        return service.lockPeriod(id);
    }

    @PostMapping("/periods/{id}/unlock")
    @PreAuthorize("hasRole('OWNER')")
    public PeriodDto unlockPeriod(@PathVariable UUID id) {
        return service.unlockPeriod(id);
    }
}

