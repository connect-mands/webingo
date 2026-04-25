import { useState } from "react";
import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { Link, Navigate } from "react-router-dom";
import { login, register } from "../features/authSlice";

export default function AuthPage({ mode = "login" }) {
  const isRegister = mode === "register";
  const dispatch = useDispatch();
  const { register: field, handleSubmit, formState: { errors } } = useForm();
  const { user, status, error } = useSelector((state) => state.auth);
  const [serverMessage, setServerMessage] = useState("");
  if (user) return <Navigate to="/" replace />;

  async function onSubmit(values) {
    const action = isRegister ? register(values) : login(values);
    const result = await dispatch(action);
    if (result.error) setServerMessage(result.error.message);
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div className="auth-info">
          <p className="eyebrow">CollabPM</p>
          <h1>Plan, assign, and ship work together in real time.</h1>
          <p>
            Manage projects with role-based access, live task updates, secure attachments,
            and team activity in one focused workspace.
          </p>
          <div className="auth-stats">
            <span>JWT Sessions</span>
            <span>RBAC</span>
            <span>Live Sync</span>
          </div>
        </div>

        <form className="auth-card" onSubmit={handleSubmit(onSubmit)}>
          <div className="auth-heading">
            <p className="eyebrow">{isRegister ? "Start your workspace" : "Welcome back"}</p>
            <h2>{isRegister ? "Create your account" : "Sign in to your account"}</h2>
            <p>{isRegister ? "Use your work email to create a secure workspace." : "Continue managing your projects and tasks."}</p>
          </div>

          <div className="form-stack">
            {isRegister && (
              <label>
                Full name
                <input placeholder="Ada Lovelace" {...field("name", { required: true, minLength: 2 })} />
              </label>
            )}
            <label>
              Email address
              <input type="email" placeholder="you@company.com" {...field("email", { required: true })} />
            </label>
            <label>
              Password
              <input type="password" placeholder="Minimum 8 characters" {...field("password", { required: true, minLength: 8 })} />
            </label>
          </div>

          {(errors.password || error || serverMessage) && (
            <p className="form-error">Please check your details and try again.</p>
          )}

          <button className="auth-submit" disabled={status === "loading"}>
            {status === "loading" ? "Please wait..." : isRegister ? "Create account" : "Sign in"}
          </button>

          <div className="auth-footer">
            {!isRegister && <Link to="/forgot-password">Forgot password?</Link>}
            <span>
              {isRegister ? "Already have an account?" : "New to CollabPM?"}{" "}
              <Link to={isRegister ? "/login" : "/register"}>
                {isRegister ? "Sign in" : "Create account"}
              </Link>
            </span>
          </div>
        </form>
      </section>
    </main>
  );
}
