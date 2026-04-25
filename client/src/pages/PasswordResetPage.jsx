import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../services/api";

export default function PasswordResetPage({ requestOnly = false }) {
  const { register, handleSubmit } = useForm();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [message, setMessage] = useState("");
  const tokenFromLink = params.get("token") || "";
  const emailFromLink = params.get("email") || "";

  async function onSubmit(values) {
    if (requestOnly) {
      await api.post("/auth/forgot-password", values);
      setMessage("If the account exists, a reset email has been sent.");
      return;
    }
    await api.post("/auth/reset-password", {
      ...values,
      email: values.email || params.get("email"),
      token: values.token || params.get("token")
    });
    setMessage("Password reset. You can sign in now.");
    setTimeout(() => navigate("/login"), 900);
  }

  return (
    <main className="auth-shell">
      <form className="card auth-card" onSubmit={handleSubmit(onSubmit)}>
        <h1>{requestOnly ? "Request password reset" : "Reset password"}</h1>
        <label>Email<input type="email" {...register("email", { required: true })} defaultValue={emailFromLink} disabled={Boolean(emailFromLink)} /></label>
        {!requestOnly && !tokenFromLink && <label>Token<input {...register("token", { required: true })} /></label>}
        {!requestOnly && <label>New password<input type="password" {...register("password", { required: true, minLength: 8 })} /></label>}
        <button>{requestOnly ? "Send reset link" : "Reset password"}</button>
        {message && <p>{message}</p>}
      </form>
    </main>
  );
}
