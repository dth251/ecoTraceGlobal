package com.ecotrace.organization.dto;

import com.ecotrace.organization.domain.AppUser;
import com.ecotrace.organization.domain.Facility;
import com.ecotrace.organization.domain.Organization;
import com.ecotrace.organization.domain.ReportingPeriod;
import com.ecotrace.organization.domain.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public final class OrganizationDtos {

    private OrganizationDtos() {
    }

    public record OrganizationDto(UUID id, String name, String taxCode, String country, String plan) {
        public static OrganizationDto from(Organization o) {
            return new OrganizationDto(o.getId(), o.getName(), o.getTaxCode(), o.getCountry(), o.getPlan());
        }
    }

    public record UpdateOrganizationRequest(
            @NotBlank @Size(max = 255) String name,
            @Size(max = 32) String taxCode,
            @Size(min = 2, max = 2) String country) {
    }

    public record UserMemberDto(UUID id, String email, String fullName, Role role, boolean active) {
        public static UserMemberDto from(AppUser u) {
            return new UserMemberDto(u.getId(), u.getEmail(), u.getFullName(), u.getRole(), u.isActive());
        }
    }

    public record InviteUserRequest(
            @NotBlank @Email @Size(max = 255) String email,
            @NotBlank @Size(max = 255) String fullName,
            @NotNull Role role,
            @NotBlank @Size(min = 8, max = 72) String initialPassword) {
    }

    public record FacilityDto(UUID id, String name, String address, String country, String gridRegion) {
        public static FacilityDto from(Facility f) {
            return new FacilityDto(f.getId(), f.getName(), f.getAddress(), f.getCountry(), f.getGridRegion());
        }
    }

    public record UpsertFacilityRequest(
            @NotBlank @Size(max = 255) String name,
            String address,
            @Size(min = 2, max = 2) String country,
            @Size(max = 32) String gridRegion) {
    }

    public record PeriodDto(UUID id, UUID facilityId, String name, LocalDate startDate, LocalDate endDate,
                            String status, Instant lockedAt) {
        public static PeriodDto from(ReportingPeriod p) {
            return new PeriodDto(p.getId(), p.getFacilityId(), p.getName(), p.getStartDate(), p.getEndDate(),
                    p.getStatus().name(), p.getLockedAt());
        }
    }

    public record CreatePeriodRequest(
            @NotNull UUID facilityId,
            @NotBlank @Size(max = 64) String name,
            @NotNull LocalDate startDate,
            @NotNull LocalDate endDate) {
    }
}

