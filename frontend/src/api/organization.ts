import { api, json } from "@/api/client";
import type { Organization, Role, User } from "@/types/domain";

export interface InviteUserRequest {
  email: string;
  fullName: string;
  role: Role;
}

export const organizationApi = {
  me: () => api<Organization>("/organizations/me"),
  update: (body: Partial<Pick<Organization, "name" | "taxCode" | "country">>) =>
    api<Organization>("/organizations/me", { method: "PUT", ...json(body) }),
  // TODO Sprint 6: quản lý người dùng
  listUsers: () => api<User[]>("/users"),
  inviteUser: (body: InviteUserRequest) => api<User>("/users", { method: "POST", ...json(body) }),
};
