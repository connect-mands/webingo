import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { createProject, fetchProjects } from "../features/projectSlice";

export default function Dashboard() {
  const dispatch = useDispatch();
  const projects = useSelector((state) => state.projects.items);
  const user = useSelector((state) => state.auth.user);
  const { register, handleSubmit, reset } = useForm();

  useEffect(() => {
    dispatch(fetchProjects());
  }, [dispatch]);

  async function onSubmit(values) {
    await dispatch(createProject(values));
    reset();
  }

  return (
    <main className="layout dashboard-layout">
      <section className="dashboard-hero">
        <div className="dashboard-hero-copy">
          <p className="eyebrow">Workspace overview</p>
          <h1>Good to see you{user?.name ? `, ${user.name}` : ""}.</h1>
          <p>Create focused project spaces, invite teammates, and track real-time task progress from one clean dashboard.</p>
        </div>
        <div className="dashboard-metrics">
          <div>
            <strong>{projects.length}</strong>
            <span>Total projects</span>
          </div>
          <div>
            <strong>{projects.filter((project) => project.status === "Active").length}</strong>
            <span>Active</span>
          </div>
          <div>
            <strong>{projects.filter((project) => project.status === "Archived").length}</strong>
            <span>Archived</span>
          </div>
        </div>
      </section>

      <section className="dashboard-grid">
        <form className="create-project-card" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <p className="eyebrow">New project</p>
            <h2>Create a workspace</h2>
            <p className="muted">Start with a project name and a short description. You can invite members after creation.</p>
          </div>
          <div className="form-stack">
            <label>
              Project name
              <input placeholder="Website redesign" {...register("name", { required: true })} />
            </label>
            <label>
              Description
              <textarea placeholder="Goals, scope, and collaboration notes..." {...register("description")} />
            </label>
          </div>
          <button className="full-width">Create project</button>
        </form>

        <div className="project-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Your projects</p>
              <h2>Recent workspaces</h2>
            </div>
            <span>{projects.length} project{projects.length === 1 ? "" : "s"}</span>
          </div>

          {projects.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">PM</div>
              <h3>No projects yet</h3>
              <p>Create your first project to start assigning tasks, inviting members, and syncing updates in real time.</p>
            </div>
          ) : (
            <div className="project-list">
              {projects.map((project) => (
                <Link className="project-card" to={`/projects/${project._id}`} key={project._id}>
                  <div>
                    <span className={`status-badge ${project.status?.toLowerCase()}`}>{project.status}</span>
                    <h3>{project.name}</h3>
                    <p>{project.description || "No description added yet."}</p>
                  </div>
                  <span className="project-arrow">Open</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
