import { lazy, Suspense, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Toast } from "./components/Toast";
import { loadCurrentUser, logout } from "./features/authSlice";

const AuthPage = lazy(() => import("./pages/AuthPage"));
const AcceptInvitePage = lazy(() => import("./pages/AcceptInvitePage"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ProjectPage = lazy(() => import("./pages/ProjectPage"));
const PasswordResetPage = lazy(() => import("./pages/PasswordResetPage"));

function Shell({ children }) {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  return (
    <>
      <nav className="topbar">
        <Link to="/" className="brand">CollabPM</Link>
        {user && <button className="secondary" onClick={() => dispatch(logout())}>Logout {user.name}</button>}
      </nav>
      {children}
      <Toast />
    </>
  );
}

export default function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(loadCurrentUser());
  }, [dispatch]);

  return (
    <Shell>
      <Suspense fallback={<main className="layout"><div className="skeleton">Loading workspace...</div></main>}>
        <Routes>
          <Route path="/login" element={<AuthPage />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
          <Route path="/forgot-password" element={<PasswordResetPage requestOnly />} />
          <Route path="/reset-password" element={<PasswordResetPage />} />
          <Route path="/accept-invite" element={<AcceptInvitePage />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/projects/:projectId" element={<ProtectedRoute><ProjectPage /></ProtectedRoute>} />
        </Routes>
      </Suspense>
    </Shell>
  );
}
