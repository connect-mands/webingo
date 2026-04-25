import { memo, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../services/api";
import { getSocket } from "../services/socket";
import { fetchProjectDetails } from "../features/projectSlice";
import { bulkApplied, bulkTasks, createTask, fetchTasks, optimisticTaskUpdate, presenceUpdated, taskDeleted, taskReceived, taskSelectors, toggleSelected, updateTask } from "../features/taskSlice";
import { showToast } from "../features/uiSlice";

const statuses = ["Todo", "In Progress", "Review", "Completed"];
const priorities = ["Low", "Medium", "High", "Critical"];

function useDebounced(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

const TaskCard = memo(function TaskCard({ task, selected, onSelect, onMove, onUpload, canWrite }) {
  return (
    <article className="task-card">
      <div className="task-card-header">
        {canWrite && (
          <label className="task-check">
            <input type="checkbox" checked={selected} onChange={() => onSelect(task._id)} />
            <span />
          </label>
        )}
        <div>
          <strong>{task.title}</strong>
          <p>{task.description || "No description added."}</p>
        </div>
      </div>
      <div className="task-card-meta">
        <span className={`pill ${task.priority?.toLowerCase()}`}>{task.priority}</span>
        {canWrite ? (
          <select value={task.status} onChange={(event) => onMove(task, event.target.value)}>
            {statuses.map((status) => <option key={status}>{status}</option>)}
          </select>
        ) : (
          <span className="readonly-status">{task.status}</span>
        )}
      </div>
      {canWrite && (
        <label className="upload">
          Attach files
          <input type="file" multiple onChange={(event) => onUpload(task._id, event.target.files)} />
        </label>
      )}
    </article>
  );
});

export default function ProjectPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const tasks = useSelector(taskSelectors.selectAll);
  const selectedIds = useSelector((state) => state.tasks.selectedIds);
  const presence = useSelector((state) => state.tasks.presence);
  const project = useSelector((state) => state.projects.current);
  const activity = useSelector((state) => state.projects.activity);
  const members = useSelector((state) => state.projects.members);
  const user = useSelector((state) => state.auth.user);
  const { register, handleSubmit, reset } = useForm({ defaultValues: { priority: "Medium", status: "Todo" } });
  const { register: inviteField, handleSubmit: handleInviteSubmit, reset: resetInvite } = useForm({ defaultValues: { role: "Team Member" } });
  const { register: projectField, handleSubmit: handleProjectSubmit, reset: resetProject } = useForm({ defaultValues: { status: "Active" } });
  const [filters, setFilters] = useState({ search: "", status: "", priority: "" });
  const [inviteError, setInviteError] = useState("");
  const debouncedSearch = useDebounced(filters.search);

  useEffect(() => {
    dispatch(fetchProjectDetails(projectId));
  }, [dispatch, projectId]);

  useEffect(() => {
    dispatch(fetchTasks({ projectId, params: { ...filters, search: debouncedSearch } }));
  }, [dispatch, projectId, filters.status, filters.priority, debouncedSearch]);

  useEffect(() => {
    if (!project) return;
    resetProject({
      name: project.name || "",
      description: project.description || "",
      status: project.status || "Active"
    });
  }, [project, resetProject]);

  useEffect(() => {
    const socket = getSocket();
    socket.connect();
    socket.emit("project:join", { projectId });
    socket.on("task:created", (task) => dispatch(taskReceived(task)));
    socket.on("task:updated", (task) => dispatch(taskReceived(task)));
    socket.on("task:deleted", ({ id }) => dispatch(taskDeleted(id)));
    socket.on("task:bulkUpdated", (payload) => dispatch(bulkApplied(payload)));
    socket.on("attachments:created", () => dispatch(showToast("Attachment uploaded")));
    socket.on("presence:update", (users) => dispatch(presenceUpdated(users)));
    return () => {
      socket.emit("project:leave", { projectId });
      socket.off("task:created");
      socket.off("task:updated");
      socket.off("task:deleted");
      socket.off("task:bulkUpdated");
      socket.off("attachments:created");
      socket.off("presence:update");
    };
  }, [dispatch, projectId]);

  const grouped = useMemo(() => Object.fromEntries(statuses.map((status) => [status, tasks.filter((task) => task.status === status)])), [tasks]);
  const currentUserId = user?.id || user?._id;
  const currentMember = members.find((member) => {
    const memberUserId = member.user?._id || member.user?.id || member.user;
    return memberUserId?.toString() === currentUserId?.toString();
  });
  const projectOwnerId = project?.owner?._id || project?.owner?.id || project?.owner;
  const currentRole = projectOwnerId?.toString() === currentUserId?.toString()
    ? "Project Admin"
    : currentMember?.role;
  const isViewer = currentRole === "Viewer";
  const isProjectAdmin = currentRole === "Project Admin";
  const canWrite = Boolean(currentRole && !isViewer);
  const canInvite = isProjectAdmin;

  async function onCreate(values) {
    if (!canWrite) return;
    await dispatch(createTask({ projectId, task: { ...values, assignees: values.assignees ? values.assignees.split(",").map((id) => id.trim()).filter(Boolean) : [] } }));
    reset();
  }

  function onMove(task, status) {
    if (!canWrite) return;
    dispatch(optimisticTaskUpdate({ ...task, status }));
    dispatch(updateTask({ projectId, taskId: task._id, patch: { status, version: task.version } }));
  }

  async function onUpload(taskId, files) {
    if (!canWrite) return;
    const form = new FormData();
    Array.from(files).forEach((file) => form.append("files", file));
    await api.post(`/projects/${projectId}/tasks/${taskId}/attachments`, form, {
      onUploadProgress: (event) => dispatch(showToast(`Upload ${Math.round((event.loaded * 100) / event.total)}%`))
    });
  }

  function bulk(operation, value) {
    if (!canWrite) return;
    dispatch(bulkTasks({ projectId, payload: { operation, taskIds: selectedIds, value } }));
  }

  async function onInvite(values) {
    if (!canInvite) return;
    setInviteError("");
    try {
      await api.post(`/projects/${projectId}/invitations`, values);
      resetInvite({ role: "Team Member" });
      dispatch(showToast(`Invite sent to ${values.email}`));
    } catch (error) {
      const message = error.response?.data?.error?.message || "Could not send invitation.";
      setInviteError(message);
      dispatch(showToast(message));
    }
  }

  async function onUpdateProject(values) {
    if (!isProjectAdmin) return;
    await api.patch(`/projects/${projectId}`, values);
    await dispatch(fetchProjectDetails(projectId));
    dispatch(showToast("Project updated"));
  }

  async function onDeleteProject() {
    if (!isProjectAdmin) return;
    const confirmed = window.confirm("Delete this project permanently? This removes tasks, members, invitations, attachments, and activity.");
    if (!confirmed) return;
    await api.delete(`/projects/${projectId}`);
    dispatch(showToast("Project deleted"));
    navigate("/");
  }

  return (
    <main className="layout project-layout">
      <section className="project-hero">
        <div className="project-hero-copy">
          <p className="eyebrow">Project</p>
          <h1>{project?.name || "Loading project..."}</h1>
          <p>{project?.description || "Organize work, track ownership, and collaborate with your team in real time."}</p>
        </div>
        <div className="project-summary">
          <div><strong>{tasks.length}</strong><span>Total tasks</span></div>
          <div><strong>{members.length}</strong><span>Members</span></div>
          <div><strong>{presence.length}</strong><span>Online</span></div>
          <div className="role-summary-card"><strong>{currentRole || "..."}</strong><span>Your role</span></div>
        </div>
      </section>

      <section className="project-toolbar">
        <div className="filter-group">
          <input placeholder="Search by title or description" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} />
          <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="">All statuses</option>{statuses.map((status) => <option key={status}>{status}</option>)}</select>
          <select value={filters.priority} onChange={(event) => setFilters({ ...filters, priority: event.target.value })}><option value="">All priorities</option>{priorities.map((priority) => <option key={priority}>{priority}</option>)}</select>
        </div>
        {canWrite ? (
          <div className="bulk-actions">
            <span>{selectedIds.length} selected</span>
            <button disabled={!selectedIds.length} onClick={() => bulk("status", "Completed")}>Complete</button>
            <button className="danger-button" disabled={!selectedIds.length} onClick={() => bulk("delete")}>Delete</button>
          </div>
        ) : (
          <div className="readonly-banner">Viewer access: read-only mode</div>
        )}
      </section>

      <section className="project-content-grid">
        <aside className="project-side-panel">
          {canWrite ? (
            <form className="task-form" onSubmit={handleSubmit(onCreate)}>
              <div>
                <p className="eyebrow">New task</p>
                <h2>Create task</h2>
                <p className="muted">Add focused work items and move them through the board.</p>
              </div>
              <div className="form-stack">
                <label>Title<input placeholder="Design review" {...register("title", { required: true })} /></label>
                <label>Description<textarea placeholder="Task context, acceptance notes, or links..." {...register("description")} /></label>
                <label>Priority<select {...register("priority")}>{priorities.map((priority) => <option key={priority}>{priority}</option>)}</select></label>
                <label>Due date<input type="date" {...register("dueDate")} /></label>
              </div>
              <button className="full-width">Create task</button>
            </form>
          ) : (
            <div className="side-card permission-card">
              <p className="eyebrow">Permissions</p>
              <h2>Read-only access</h2>
              <p className="muted">You are a Viewer in this project, so you can inspect tasks, members, presence, and activity, but cannot create, edit, upload, invite, or delete.</p>
            </div>
          )}

          {isProjectAdmin && (
            <form className="side-card project-settings-card" onSubmit={handleProjectSubmit(onUpdateProject)}>
              <div>
                <p className="eyebrow">Admin</p>
                <h2>Project settings</h2>
                <p className="muted">Update project details, archive work, or delete this workspace.</p>
              </div>
              <div className="form-stack">
                <label>
                  Project name
                  <input placeholder="Project name" {...projectField("name", { required: true, minLength: 2 })} />
                </label>
                <label>
                  Description
                  <textarea placeholder="Project description" {...projectField("description")} />
                </label>
                <label>
                  Status
                  <select {...projectField("status", { required: true })}>
                    <option>Active</option>
                    <option>Archived</option>
                  </select>
                </label>
              </div>
              <div className="settings-actions">
                <button type="submit">Save changes</button>
                <button type="button" className="danger-button" onClick={onDeleteProject}>Delete project</button>
              </div>
            </form>
          )}

          <div className="side-card">
            <div className="section-heading compact">
              <div>
                <p className="eyebrow">Team</p>
                <h2>Members</h2>
              </div>
              <span>{members.length}</span>
            </div>
            <div className="member-list">
              {members.length === 0 ? <p className="muted">No members loaded yet.</p> : members.map((member) => (
                <div className="member-row" key={member._id}>
                  <span>{member.user?.name?.slice(0, 1) || "U"}</span>
                  <div>
                    <strong>{member.user?.name || "Unknown user"}</strong>
                    <p>{member.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {canInvite && (
            <form className="side-card invite-card" onSubmit={handleInviteSubmit(onInvite)}>
              <div>
                <p className="eyebrow">Invite</p>
                <h2>Invite member</h2>
                <p className="muted">Send an email invitation and assign project access.</p>
              </div>
              <div className="form-stack">
                <label>
                  Email address
                  <input type="email" placeholder="teammate@example.com" {...inviteField("email", { required: true })} />
                </label>
                <label>
                  Role
                  <select {...inviteField("role", { required: true })}>
                    <option>Team Member</option>
                    <option>Viewer</option>
                    <option>Project Admin</option>
                  </select>
                </label>
              </div>
              {inviteError && <p className="form-error">{inviteError}</p>}
              <button className="full-width">Send invite</button>
            </form>
          )}

          <div className="side-card">
            <div className="section-heading compact">
              <div>
                <p className="eyebrow">Live</p>
                <h2>Presence</h2>
              </div>
              <span>{presence.length}</span>
            </div>
            <div className="presence-list">
              {presence.length === 0 ? <p className="muted">No active viewers.</p> : presence.map((item) => (
                <span key={item.user._id}>{item.user.name}{item.editingTaskId ? " editing" : " viewing"}</span>
              ))}
            </div>
          </div>

          <div className="side-card activity-panel">
            <div className="section-heading compact">
              <div>
                <p className="eyebrow">Activity</p>
                <h2>Recent updates</h2>
              </div>
            </div>
            <div className="activity-list">
              {activity.length === 0 ? <p className="muted">No activity recorded yet.</p> : activity.slice(0, 8).map((entry) => (
                <div className="activity-row" key={entry._id}>
                  <span />
                  <div>
                    <strong>{entry.action}</strong>
                    <p>{entry.actor?.name || "System"}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <section className="workspace-panel">
          <div className="section-heading board-heading">
            <div>
              <p className="eyebrow">Task board</p>
              <h2>Workflow</h2>
            </div>
            <span>{tasks.length} task{tasks.length === 1 ? "" : "s"}</span>
          </div>

          <div className="board">
            {statuses.map((status) => (
              <div className="column" key={status}>
                <div className="column-heading">
                  <h2>{status}</h2>
                  <span>{grouped[status]?.length || 0}</span>
                </div>
                {grouped[status]?.length ? grouped[status].map((task) => (
                  <TaskCard
                    key={task._id}
                    task={task}
                    selected={selectedIds.includes(task._id)}
                    onSelect={(id) => dispatch(toggleSelected(id))}
                    onMove={onMove}
                    onUpload={onUpload}
                    canWrite={canWrite}
                  />
                )) : <p className="column-empty">No tasks here</p>}
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
