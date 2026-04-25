import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { fetchProjects } from "../features/projectSlice";
import { api } from "../services/api";

export default function AcceptInvitePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const authStatus = useSelector((state) => state.auth.status);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [invite, setInvite] = useState(null);
  const [validationStatus, setValidationStatus] = useState("idle");
  const email = params.get("email") || "";
  const token = params.get("token") || "";

  useEffect(() => {
    if (!email || !token) return;
    let ignore = false;

    async function validateInvite() {
      setValidationStatus("loading");
      setMessage("");
      try {
        const { data } = await api.get("/projects/invitations/validate", { params: { email, token } });
        if (!ignore) {
          setInvite(data);
          setValidationStatus("valid");
        }
      } catch (error) {
        if (!ignore) {
          setInvite(null);
          setValidationStatus("invalid");
          setMessage(error.response?.data?.error?.message || "Invalid or expired invitation.");
        }
      }
    }

    validateInvite();
    return () => {
      ignore = true;
    };
  }, [email, token]);

  async function acceptInvite() {
    setStatus("loading");
    setMessage("");
    try {
      await api.post("/projects/accept-invite", { email, token });
      await dispatch(fetchProjects());
      setStatus("success");
      setMessage("Invitation accepted. Redirecting to your dashboard...");
      setTimeout(() => navigate("/", { replace: true }), 900);
    } catch (error) {
      setStatus("failed");
      setMessage(error.response?.data?.error?.message || "Could not accept invitation.");
    }
  }

  const isInvalidLink = !email || !token;
  const isChecking = authStatus === "checking" || authStatus === "loading" || validationStatus === "loading";
  const isInviteInvalid = validationStatus === "invalid";

  return (
    <main className="invite-shell">
      <section className="invite-card-panel">
        <div className="invite-visual">
          <p className="eyebrow">Project invitation</p>
          <h1>You have been invited to collaborate.</h1>
          <p>Accept the invite with the same email address it was sent to, then start working with your team in CollabPM.</p>
        </div>

        <div className="invite-action-card">
          <p className="eyebrow">Invite details</p>
          <h2>Join project workspace</h2>
          <div className="invite-detail">
            <span>Email</span>
            <strong>{email || "Missing email"}</strong>
          </div>
          {invite?.project?.name && (
            <div className="invite-detail">
              <span>Project</span>
              <strong>{invite.project.name}</strong>
            </div>
          )}

          {isInvalidLink ? (
            <p className="form-error">This invite link is missing required details.</p>
          ) : isInviteInvalid ? (
            <p className="form-error">{message || "Invalid or expired invitation."}</p>
          ) : isChecking ? (
            <div className="skeleton">Checking invitation...</div>
          ) : user ? (
            <>
              <p className="muted">You are signed in as {user.email}. You will join as {invite?.role || "a member"}.</p>
              <button className="full-width" disabled={status === "loading"} onClick={acceptInvite}>
                {status === "loading" ? "Accepting..." : "Accept invitation"}
              </button>
            </>
          ) : (
            <div className="invite-auth-actions">
              <p className="muted">Please sign in or create an account first, then return to this invite link.</p>
              <Link className="button-link" to="/login">Sign in</Link>
              <Link className="button-link secondary-link" to="/register">Create account</Link>
            </div>
          )}

          {message && !isInviteInvalid && <p className={status === "success" ? "success-message" : "form-error"}>{message}</p>}
        </div>
      </section>
    </main>
  );
}
