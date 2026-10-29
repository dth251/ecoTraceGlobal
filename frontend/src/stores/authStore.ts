import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthResponse, User } from "@/types/domain";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setSession: (res: AuthResponse) => void;
  logout: () => void;
}

export const AUTH_STORAGE_KEY = "ecotrace-auth";

// MVP: lưu token trong localStorage (xem mục 22 về rủi ro XSS)
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      setSession: (res) =>
        set({ accessToken: res.accessToken, refreshToken: res.refreshToken, user: res.user }),
      logout: () => set({ accessToken: null, refreshToken: null, user: null }),
    }),
    { name: AUTH_STORAGE_KEY },
  ),
);

export const isAuthenticated = () => !!useAuthStore.getState().accessToken;
