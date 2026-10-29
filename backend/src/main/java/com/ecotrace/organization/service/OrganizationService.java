package com.ecotrace.organization.service;

import com.ecotrace.common.audit.AuditService;
import com.ecotrace.common.exception.ApiException;
import com.ecotrace.common.tenant.TenantContext;
import com.ecotrace.organization.domain.AppUser;
import com.ecotrace.organization.domain.Facility;
import com.ecotrace.organization.domain.Organization;
import com.ecotrace.organization.domain.ReportingPeriod;
import com.ecotrace.organization.domain.Role;
import com.ecotrace.organization.dto.OrganizationDtos.CreatePeriodRequest;
import com.ecotrace.organization.dto.OrganizationDtos.FacilityDto;
import com.ecotrace.organization.dto.OrganizationDtos.InviteUserRequest;
import com.ecotrace.organization.dto.OrganizationDtos.OrganizationDto;
import com.ecotrace.organization.dto.OrganizationDtos.PeriodDto;
import com.ecotrace.organization.dto.OrganizationDtos.UpdateOrganizationRequest;
import com.ecotrace.organization.dto.OrganizationDtos.UpsertFacilityRequest;
import com.ecotrace.organization.dto.OrganizationDtos.UserMemberDto;
import com.ecotrace.organization.repository.AppUserRepository;
import com.ecotrace.organization.repository.FacilityRepository;
import com.ecotrace.organization.repository.OrganizationRepository;
import com.ecotrace.organization.repository.ReportingPeriodRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.UUID;

/**
 * Dịch vụ quản lý doanh nghiệp, người dùng, nhà máy, kỳ báo cáo (mục 5, 11).
 * Mọi thao tác lọc theo {@link TenantContext#organizationId()} để cách ly dữ liệu giữa các tenant.
 */
@Service
public class OrganizationService {

    private final OrganizationRepository organizations;
    private final AppUserRepository users;
    private final FacilityRepository facilities;
    private final ReportingPeriodRepository periods;
    private final PasswordEncoder passwordEncoder;
    private final AuditService audit;

    public OrganizationService(OrganizationRepository organizations, AppUserRepository users,
                               FacilityRepository facilities, ReportingPeriodRepository periods,
                               PasswordEncoder passwordEncoder, AuditService audit) {
        this.organizations = organizations;
        this.users = users;
        this.facilities = facilities;
        this.periods = periods;
        this.passwordEncoder = passwordEncoder;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public OrganizationDto getCurrentOrganization() {
        Organization org = organizations.findById(TenantContext.organizationId())
                .orElseThrow(() -> ApiException.notFound("organization", TenantContext.organizationId()));
        return OrganizationDto.from(org);
    }

    @Transactional
    public OrganizationDto updateCurrentOrganization(UpdateOrganizationRequest req) {
        Organization org = organizations.findById(TenantContext.organizationId())
                .orElseThrow(() -> ApiException.notFound("organization", TenantContext.organizationId()));
        org.setName(req.name().trim());
        org.setTaxCode(req.taxCode());
        if (req.country() != null && !req.country().isBlank()) {
            org.setCountry(req.country().toUpperCase(Locale.ROOT));
        }
        return OrganizationDto.from(org);
    }

    @Transactional(readOnly = true)
    public List<UserMemberDto> listUsers() {
        return users.findAllByOrganizationIdOrderByCreatedAtAsc(TenantContext.organizationId())
                .stream().map(UserMemberDto::from).toList();
    }

    @Transactional
    public UserMemberDto inviteUser(InviteUserRequest req) {
        if (req.role() == Role.SYSTEM_ADMIN) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Cannot assign SYSTEM_ADMIN");
        }
        String email = req.email().trim().toLowerCase(Locale.ROOT);
        if (users.existsByEmail(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "EMAIL_TAKEN", "Email is already in use");
        }
        Organization org = organizations.getReferenceById(TenantContext.organizationId());
        AppUser u = users.save(new AppUser(org, email, passwordEncoder.encode(req.initialPassword()),
                req.fullName().trim(), req.role()));
        audit.record(AuditService.CREATE, "app_user", u.getId(), null, UserMemberDto.from(u));
        return UserMemberDto.from(u);
    }

    // --- Nhà máy (facility) ---

    @Transactional(readOnly = true)
    public List<FacilityDto> listFacilities() {
        return facilities.findAllByOrganizationIdOrderByCreatedAtAsc(TenantContext.organizationId())
                .stream().map(FacilityDto::from).toList();
    }

    @Transactional(readOnly = true)
    public FacilityDto getFacility(UUID id) {
        return FacilityDto.from(requireFacility(id));
    }

    @Transactional
    public FacilityDto createFacility(UpsertFacilityRequest req) {
        Facility f = facilities.save(new Facility(TenantContext.organizationId(),
                req.name().trim(), req.address(), req.country(), req.gridRegion()));
        FacilityDto dto = FacilityDto.from(f);
        audit.record(AuditService.CREATE, "facility", f.getId(), null, dto);
        return dto;
    }

    @Transactional
    public FacilityDto updateFacility(UUID id, UpsertFacilityRequest req) {
        Facility f = requireFacility(id);
        FacilityDto before = FacilityDto.from(f);
        f.setName(req.name().trim());
        f.setAddress(req.address());
        if (req.country() != null && !req.country().isBlank()) f.setCountry(req.country().toUpperCase(Locale.ROOT));
        if (req.gridRegion() != null && !req.gridRegion().isBlank()) f.setGridRegion(req.gridRegion());
        FacilityDto after = FacilityDto.from(f);
        audit.record(AuditService.UPDATE, "facility", f.getId(), before, after);
        return after;
    }

    @Transactional
    public void deleteFacility(UUID id) {
        Facility f = requireFacility(id);
        facilities.delete(f);
        audit.record(AuditService.DELETE, "facility", id, FacilityDto.from(f), null);
    }

    public Facility requireFacility(UUID id) {
        return facilities.findByIdAndOrganizationId(id, TenantContext.organizationId())
                .orElseThrow(() -> ApiException.notFound("facility", id));
    }

    // --- Kỳ báo cáo (reporting_period) ---

    @Transactional(readOnly = true)
    public List<PeriodDto> listPeriods(UUID facilityId) {
        UUID orgId = TenantContext.organizationId();
        List<ReportingPeriod> list = facilityId == null
                ? periods.findAllByOrganizationIdOrderByStartDateDesc(orgId)
                : periods.findAllByOrganizationIdAndFacilityIdOrderByStartDateDesc(orgId, facilityId);
        return list.stream().map(PeriodDto::from).toList();
    }

    @Transactional
    public PeriodDto createPeriod(CreatePeriodRequest req) {
        if (req.endDate().isBefore(req.startDate())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "endDate must be >= startDate");
        }
        Facility facility = requireFacility(req.facilityId());
        ReportingPeriod p = periods.save(new ReportingPeriod(facility.getOrganizationId(), facility.getId(),
                req.name().trim(), req.startDate(), req.endDate()));
        PeriodDto dto = PeriodDto.from(p);
        audit.record(AuditService.CREATE, "reporting_period", p.getId(), null, dto);
        return dto;
    }

    @Transactional
    public PeriodDto lockPeriod(UUID id) {
        ReportingPeriod p = requirePeriod(id);
        p.lock(TenantContext.userId());
        PeriodDto dto = PeriodDto.from(p);
        audit.record(AuditService.LOCK, "reporting_period", p.getId(), null, dto);
        return dto;
    }

    @Transactional
    public PeriodDto unlockPeriod(UUID id) {
        ReportingPeriod p = requirePeriod(id);
        p.unlock();
        PeriodDto dto = PeriodDto.from(p);
        audit.record(AuditService.UNLOCK, "reporting_period", p.getId(), null, dto);
        return dto;
    }

    /** Lấy kỳ báo cáo thuộc tenant hiện tại; ném 404 nếu không thuộc tenant. */
    public ReportingPeriod requirePeriod(UUID periodId) {
        return periods.findByIdAndOrganizationId(periodId, TenantContext.organizationId())
                .orElseThrow(() -> ApiException.notFound("reporting_period", periodId));
    }

    /** Lấy kỳ báo cáo và chặn nếu kỳ đã khóa (mục 7.4, 8.3). */
    public ReportingPeriod requireOpenPeriod(UUID periodId) {
        ReportingPeriod p = requirePeriod(periodId);
        if (p.isLocked()) {
            throw ApiException.periodLocked(periodId);
        }
        return p;
    }
}

