import type { ReactNode } from "react";
import { usePermission } from "@/hooks/usePermission";
import { ForbiddenPage } from "@/pages/errors/ForbiddenPage";
import type { Role } from "@/types/domain";

export interface RequireRoleProps {
  min: Role;
  fallback?: ReactNode;
  children: ReactNode;
}

export function RequireRole({ min, fallback, children }: RequireRoleProps) {
  const { can } = usePermission();

  if (!can(min)) {
    return <>{fallback !== undefined ? fallback : <ForbiddenPage />}</>;
  }

  return <>{children}</>;
}
