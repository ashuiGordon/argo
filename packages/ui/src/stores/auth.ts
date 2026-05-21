import { create } from "zustand";

interface AuthState {
  token: string | null;
  user: { id: string; email: string } | null;
  setAuth: (token: string, user: { id: string; email: string }) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem("argo_token"),
  user: JSON.parse(localStorage.getItem("argo_user") || "null"),
  setAuth: (token, user) => {
    localStorage.setItem("argo_token", token);
    localStorage.setItem("argo_user", JSON.stringify(user));
    set({ token, user });
  },
  logout: () => {
    localStorage.removeItem("argo_token");
    localStorage.removeItem("argo_user");
    set({ token: null, user: null });
  },
}));
