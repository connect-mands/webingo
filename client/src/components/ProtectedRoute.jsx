import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";

export function ProtectedRoute({ children }) {
  const user = useSelector((state) => state.auth.user);
  const status = useSelector((state) => state.auth.status);
  if (status === "checking" || status === "loading") {
    return <main className="layout"><div className="skeleton">Checking your session...</div></main>;
  }
  return user ? children : <Navigate to="/login" replace />;
}
