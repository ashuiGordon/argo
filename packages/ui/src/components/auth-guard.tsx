import { Navigate } from "react-router-dom";
import { useAuthStore } from "../stores/auth";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);

  if (!token) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}
