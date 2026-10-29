import { useAuthStore } from "@/stores/authStore";
import type { Role } from "@/types/domain";

// Thứ tự quyền: VIEWER < EDITOR < OWNER < SYSTEM_ADMIN
export const ROLE_ORDER: Record<Role, number> = {
  VIEWER: 0,
  EDITOR: 1,
  OWNER: 2,
  SYSTEM_ADMIN: 3,
};

export const hasRole = (role: Role | null | undefined, min: Role) =>
  !!role && ROLE_ORDER[role] >= ROLE_ORDER[min];

/** Frontend chỉ ẩn/vô hiệu nút; kiểm tra thật nằm ở backend */
export function usePermission() {
  const role = useAuthStore((s) => s.user?.role ?? null);
  return {
    role,
    can: (min: Role) => hasRole(role, min),
    canEdit: hasRole(role, "EDITOR"),
    isOwner: hasRole(role, "OWNER"),
  };
}
